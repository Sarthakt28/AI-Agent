import base64
import docker
from docker.errors import ImageNotFound, DockerException
import subprocess
import tempfile
import os
import sys

# Module-level Docker client singleton (reuse connection across requests)
_docker_client = None

def _get_docker_client():
    """Get or create a reusable Docker client connection."""
    global _docker_client
    if _docker_client is None:
        try:
            _docker_client = docker.from_env()
        except DockerException as e:
            raise DockerException(
                "Cannot connect to Docker daemon. "
                "Make sure Docker Desktop is running on your system. "
                f"Details: {str(e)}"
            )
    return _docker_client

def _execute_python_code_subprocess(code: str) -> str:
    """
    Fallback execution using python subprocess.
    Used when Docker is not available (e.g. Render / serverless platforms).
    """
    try:
        # Create a temporary file to hold the code
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
            f.write(code)
            temp_file_path = f.name
        
        try:
            # Run the python script in a subprocess with a timeout
            result = subprocess.run(
                [sys.executable, temp_file_path],
                capture_output=True,
                text=True,
                timeout=10
            )
            stdout = result.stdout
            stderr = result.stderr
            
            output = []
            if stdout:
                output.append(stdout)
            if stderr:
                output.append(f"Error Output:\n{stderr}")
                
            final_output = "\n".join(output)
            return final_output if final_output.strip() else "Code executed successfully (no output)."
        finally:
            # Clean up the temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out (exceeded 10 seconds limit)."
    except Exception as ex:
        return f"Error during local subprocess execution: {str(ex)}"

def execute_python_code(code: str) -> str:
    # 1. Connect to Docker. If fails, fallback to local subprocess.
    try:
        client = _get_docker_client()
    except DockerException as e:
        print(f"[SANDBOX WARNING] Docker not available: {e}. Falling back to subprocess execution.")
        return _execute_python_code_subprocess(code)

    image_name = "python:3.11-alpine"

    # 2. Base64 encoding to prevent shell escaping problems
    encoded_code = base64.b64encode(code.encode("utf-8")).decode("utf-8")
    command_str = f"python -c \"import base64; exec(base64.b64decode('{encoded_code}').decode('utf-8'))\""
    try:
        # 3. Pull image if not already present
        try:
            client.images.get(image_name)
        except ImageNotFound:
            print(f"Pulling Docker image '{image_name}'... (first time might take a few seconds)")
            client.images.pull(image_name)
            
        # 4. Run isolated container with security hardening
        timeout_seconds = 10
        container = client.containers.run(
            image=image_name,
            command=["sh", "-c", command_str],
            detach=True,                # Run in background
            network_disabled=True,      # Secure: no internet access inside sandbox
            mem_limit="128m",           # Secure: max memory limit 128 MB
            pids_limit=50,              # Secure: prevent fork bomb attacks
            read_only=True,             # Secure: read-only filesystem
            stdout=True,
            stderr=True
        )
        
        # 5. Wait for container to finish with timeout (no polling needed)
        try:
            result = container.wait(timeout=timeout_seconds)
        except Exception:
            # Timeout or other wait error — kill the container
            try:
                container.kill()
            except Exception:
                pass
            try:
                container.remove(force=True)
            except Exception:
                pass
            return "Error: Code execution timed out (exceeded 10 seconds limit)."
            
        logs = container.logs()
        container.remove()
        output = logs.decode("utf-8")
        return output if output.strip() else "Code executed successfully (no output)."
        
    except docker.errors.ContainerError as ce:
        # Python traceback error catches (e.g., SyntaxError, ZeroDivisionError)
        stderr = ce.stderr.decode("utf-8") if ce.stderr else str(ce)
        return f"Code Execution Error:\n{stderr}"
        
    except Exception as e:
        return f"Error during sandbox execution: {str(e)}"

# Quick manual testing local run ke liye (optional)
if __name__ == "__main__":
    test_code = """
import math
print("Hello from Sandbox!")
print(f"Factorial of 5 is: {math.factorial(5)}")
"""
    print(execute_python_code(test_code))