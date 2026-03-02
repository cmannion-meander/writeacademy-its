import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
BASE_URL = "http://127.0.0.1:8123"
API_KEY = os.getenv("WRITEACADEMY_API_KEY")
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
}

def run_brainstorm(initial_ideas: str) -> str:
    """Calls the /brainstorm endpoint and prints the streamed response."""
    print("--- 1. Starting Brainstorm ---")
    print(f"Initial idea: \"{initial_ideas}\"\n")
    
    payload = {"ideas": initial_ideas}
    full_response_text = ""

    try:
        with requests.post(f"{BASE_URL}/brainstorm", json=payload, headers=HEADERS, stream=True) as response:
            response.raise_for_status()
            print("🤖 Creative Coach says:")
            for line in response.iter_lines():
                if line:
                    data = json.loads(line)
                    if data.get("type") == "text":
                        content = data.get("content", "")
                        print(content, end="", flush=True)
                        full_response_text += content
                    elif data.get("type") == "error":
                        print(f"\n\nERROR from server: {data.get('content')}")
                        return ""
            print("\n\n--- Brainstorm Complete ---\n")
            return full_response_text
    except requests.exceptions.RequestException as e:
        print(f"\n\n--- ERROR ---")
        print(f"Failed to connect to the server at {BASE_URL}.")
        print("Please make sure the FastAPI server is running: `uvicorn main:app --reload`")
        print(f"Error details: {e}")
        return ""

def run_visualize(prompt: str, output_filename: str = "generated_scene.png"):
    """Calls the /visualize endpoint and saves the generated image."""
    print("--- 2. Starting Visualization ---")
    print(f"Visualization prompt: \"{prompt}\"\n")

    payload = {"prompt": prompt}
    
    try:
        with requests.post(f"{BASE_URL}/visualize", json=payload, headers=HEADERS) as response:
            response.raise_for_status()
            
            if 'image/png' in response.headers.get('Content-Type', ''):
                with open(output_filename, "wb") as f:
                    f.write(response.content)
                print(f"✅ Success! Image saved as '{output_filename}'")
                print("--- Visualization Complete ---")
            else:
                error_data = response.json()
                print(f"--- ERROR ---")
                print(f"Image generation failed: {error_data.get('detail', 'Unknown error')}")

    except requests.exceptions.RequestException as e:
        print(f"\n\n--- ERROR ---")
        print(f"Failed to connect to the server at {BASE_URL}.")
        print(f"Error details: {e}")


if __name__ == "__main__":
    if not API_KEY:
        print("ERROR: WRITEACADEMY_API_KEY not found in your .env file. Please set it.")
    else:
        # Step 1: Brainstorm an idea from the sample lesson
        initial_idea = "What if a character from a myth, like Cupid, lived in modern times?"
        brainstorm_result = run_brainstorm(initial_idea)

        if brainstorm_result:
            # Step 2: Pick a promising idea and create a detailed prompt for visualization
            chosen_idea_prompt = (
                "A clumsy teenage Cupid with messy hair and crooked wings, accidentally "
                "shooting a glowing love arrow at a potted plant in the middle of a "
                "high school gym during a dance. Two shy kids are talking in the background, unaware."
            )
            
            # Step 3: Generate the scene using "Nano Banana"
            run_visualize(chosen_idea_prompt)