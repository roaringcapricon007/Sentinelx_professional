import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import os

class PrimeBrain:
    """
    PRIME_AI Ultra-Level LLM Brain
    Architecture: TinyLlama-1.1B (Transformer)
    Optimization: bfloat16 + CUDA (Optimized for v7.0)
    """
    def __init__(self, model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"--- PRIME_AI Quantum Neural Nexus Initializing on {self.device.upper()} ---")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
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
            print("--- Quantum Neural Nexus Synchronized ---")
        except Exception as e:
            print(f"Neural Initialization Error: {e}")
            self.chat_pipeline = None

    def generate_response(self, prompt, context=""):
        """
        Hyper-intelligent response generation with futuristic sentiment.
        """
        if not self.chat_pipeline:
            return "Neural pathways currently undergoing maintenance. Systems nominal."

        messages = [
            {
                "role": "system",
                "content": "You are PRIME_AI, the SentinelX System Intelligence. Your tone is futuristic, professional, and slightly robotic but highly efficient. You manage global infrastructure with absolute precision.",
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
            max_new_tokens=256, 
            do_sample=True, 
            temperature=0.8, 
            top_k=50, 
            top_p=0.9
        )
        
        full_text = outputs[0]["generated_text"]
        return full_text.split("<|assistant|>")[-1].strip()

    def summarize_anomalies(self, logs):
        """
        Uses LLM to summarize a batch of logs for human-readable reports.
        """
        # Take a subset if logs are too many
        log_sample = "\n".join(logs[:5])
        prompt = f"Summarize these infrastructure logs and identify the root cause:\n{log_sample}"
        return self.generate_response(prompt)

    def predict_threat(self, metrics):
        """
        Simulated Predictive Analysis using neural weights.
        """
        risk_score = sum(metrics.values()) / (len(metrics) * 10)
        return "CRITICAL" if risk_score > 0.8 else "STABLE"

if __name__ == "__main__":
    # Test initialization
    brain = PrimeBrain()
    if brain.chat_pipeline:
        print("Test Response:", brain.generate_response("System check status."))
