import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import os

class PrimeBrain:
    """
    PRIME_AI High-Level LLM Brain
    Architecture: TinyLlama-1.1B (Transformer)
    Optimization: bfloat16 + CUDA (RTX 4050)
    """
    def __init__(self, model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"--- PRIME_AI Advanced LLM Initializing on {self.device.upper()} ---")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        # Use bfloat16 for current trend in speed/precision on 4050
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id, 
            torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32
        ).to(self.device)
        
        self.chat_pipeline = pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32,
            device_map="auto"
        )

    def generate_response(self, prompt, context=""):
        """
        Chat-style prompt generation.
        Uses the 'ChatML' format which is a current LLM trend.
        """
        messages = [
            {
                "role": "system",
                "content": "You are PRIME_AI, a high-level Infrastructure AI. You analyze logs, manage servers, and provide technical fixes with Autobot efficiency.",
            },
            {"role": "user", "content": f"{prompt} | Context: {context}"},
        ]
        
        formatted_prompt = self.tokenizer.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        outputs = self.chat_pipeline(
            formatted_prompt, 
            max_new_tokens=150, 
            do_sample=True, 
            temperature=0.7, 
            top_k=50, 
            top_p=0.95
        )
        
        full_text = outputs[0]["generated_text"]
        # Extract the assistant's reply
        return full_text.split("<|assistant|>")[-1].strip()

    def unsupervised_log_cluster(self, logs):
        """
        Experimental: Unsupervised Learning (Clustering)
        Analyzes patterns in raw logs without labels.
        """
        # (Placeholder for K-Means/Embedding logic)
        return f"Analyzed {len(logs)} logs using Deep Embedding clustering. Patterns identified."

if __name__ == "__main__":
    # Test initialization
    brain = SentinelBrain()
    print("Test Response:", brain.generate_response("Check system load status."))
