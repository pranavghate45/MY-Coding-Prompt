from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

app = FastAPI()

device = "cuda" if torch.cuda.is_available() else "cpu"

# 🔥 LOAD MODEL
base_model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    device_map="auto"
)

adapter_path = Path(__file__).resolve().parent / "super-prompt-model"

model = PeftModel.from_pretrained(
    base_model,
    str(adapter_path)   # 🔥 IMPORTANT PATH
)

tokenizer = AutoTokenizer.from_pretrained(str(adapter_path))

# 🔹 INPUT SCHEMA
class UserInput(BaseModel):
    target: str
    type: str
    framework: str
    style: str
    backend: str
    database: str
    goal: str
    level: str

# 🔹 PROMPT BUILDER
def build_prompt(data):
    return f"""### Instruction:
Generate a SUPER PROMPT (NO CODE).

Level: {data.level}

### Input:
Project Target: {data.target}
Project Type: {data.type}
Framework: {data.framework}
Style System: {data.style}
Backend: {data.backend}
Database: {data.database}
Project Goal: {data.goal}

### Output:
"""

# 🔹 API
@app.post("/generate")
def generate_prompt(user_input: UserInput):

    input_text = build_prompt(user_input)

    inputs = tokenizer(input_text, return_tensors="pt").to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=300,
        temperature=0.3
    )

    result = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return {"prompt": result}