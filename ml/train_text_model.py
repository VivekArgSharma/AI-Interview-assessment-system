"""
PRISM Text Model Trainer (PRD Section 7.2 & 18.6)
Trains regression heads on sentence embeddings to predict rubric content & reasoning scores.
"""

import os
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sentence_transformers import SentenceTransformer

class TextRegressionHead(nn.Module):
    def __init__(self, input_dim: int = 384, hidden_dim: int = 128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        return self.net(x)

def train_text_scorer(
    data_path: str = "ml/data/interview_dataset.json",
    model_save_path: str = "ml/checkpoints/text_scorer_head.pt",
    epochs: int = 15,
    batch_size: int = 16,
    lr: float = 0.001
):
    if not os.path.exists(data_path):
        from generate_dataset import generate_multimodal_dataset
        generate_multimodal_dataset(data_path)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} training samples from {data_path}")
    transcripts = [d["transcript"] for d in data]
    targets = [d["ratings"]["consensus_ground_truth"] for d in data]

    print("Encoding transcripts via SentenceTransformer...")
    encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embeddings = encoder.encode(transcripts, convert_to_numpy=True, show_progress_bar=True)

    X_train, X_val, y_train, y_val = train_test_split(embeddings, targets, test_size=0.2, random_state=42)

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.float32).unsqueeze(1)

    train_loader = DataLoader(TensorDataset(X_train_t, y_train_t), batch_size=batch_size, shuffle=True)

    head = TextRegressionHead(input_dim=embeddings.shape[1])
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(head.parameters(), lr=lr, weight_decay=1e-4)

    print("\n--- Training Text Regression Scorer ---")
    head.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            preds = head(batch_x)
            loss = criterion(preds, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if epoch % 5 == 0 or epoch == epochs:
            head.eval()
            with torch.no_grad():
                val_preds = head(X_val_t)
                val_mae = torch.mean(torch.abs(val_preds - y_val_t)).item()
                val_rmse = torch.sqrt(torch.mean((val_preds - y_val_t) ** 2)).item()
            print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {total_loss/len(train_loader):.4f} | Val MAE: {val_mae:.3f} | Val RMSE: {val_rmse:.3f}")
            head.train()

    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    torch.save(head.state_dict(), model_save_path)
    print(f"\n[OK] Saved trained text regression head checkpoint to {model_save_path}")

if __name__ == "__main__":
    train_text_scorer()
