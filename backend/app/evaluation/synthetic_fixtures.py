"""
Synthetic Benchmark Dataset Schema & Fixtures.

IMPORTANT NOTICE:
This dataset contains purely SYNTHETIC calibration fixtures designed to test and demonstrate
the evaluation pipeline (MAE, RMSE, R2, Spearman Rank Correlation).
It does NOT represent empirical human-rated ground truth and MUST NOT be cited as clinical or empirical research accuracy.
"""

from typing import List, Dict, Any

SYNTHETIC_DATASET: List[Dict[str, Any]] = [
    {
        "id": "syn_01",
        "role": "software_engineer",
        "question": "Explain how a hash map works.",
        "candidate_answer": (
            "A hash map maps keys to values using a hash function. The hash function calculates an index into an array. "
            "If collisions occur, chaining with linked lists or open addressing resolves them. Average lookup is O(1)."
        ),
        "synthetic_ground_truth": {
            "content_score": 9.0,
            "relevance_score": 8.8,
            "overall_score": 8.9,
            "rubric_coverage_ratio": 1.0
        },
        "is_synthetic": True,
        "split": "test"
    },
    {
        "id": "syn_02",
        "role": "software_engineer",
        "question": "Explain how a hash map works.",
        "candidate_answer": (
            "A hash map is a list that stores data. It has fast search and saves memory."
        ),
        "synthetic_ground_truth": {
            "content_score": 3.0,
            "relevance_score": 4.5,
            "overall_score": 3.7,
            "rubric_coverage_ratio": 0.25
        },
        "is_synthetic": True,
        "split": "test"
    },
    {
        "id": "syn_03",
        "role": "software_engineer",
        "question": "Describe the difference between processes and threads.",
        "candidate_answer": (
            "Processes run in separate memory spaces and communicate via IPC, while threads exist within a process "
            "and share heap and code segments. Threads require mutex locks to avoid race conditions."
        ),
        "synthetic_ground_truth": {
            "content_score": 8.5,
            "relevance_score": 8.5,
            "overall_score": 8.5,
            "rubric_coverage_ratio": 1.0
        },
        "is_synthetic": True,
        "split": "test"
    },
    {
        "id": "syn_04",
        "role": "software_engineer",
        "question": "Explain the time complexity of binary search.",
        "candidate_answer": (
            "Binary search requires a sorted array. At each step, it cuts the search space in half. "
            "Because we divide by two, N / 2^k = 1, so the time complexity is O(log n)."
        ),
        "synthetic_ground_truth": {
            "content_score": 8.5,
            "relevance_score": 8.2,
            "overall_score": 8.4,
            "rubric_coverage_ratio": 0.75
        },
        "is_synthetic": True,
        "split": "test"
    },
    {
        "id": "syn_05",
        "role": "customer_support",
        "question": "How would you handle an angry customer?",
        "candidate_answer": (
            "I would listen without interrupting, acknowledge their frustration empathetically, offer a sincere apology, "
            "and explain clear action steps with a timeframe to resolve the issue. Then I follow up to confirm satisfaction."
        ),
        "synthetic_ground_truth": {
            "content_score": 9.5,
            "relevance_score": 9.0,
            "overall_score": 9.3,
            "rubric_coverage_ratio": 1.0
        },
        "is_synthetic": True,
        "split": "test"
    },
    {
        "id": "syn_06",
        "role": "customer_support",
        "question": "How would you handle an angry customer?",
        "candidate_answer": (
            "I would tell them to calm down and transfer them to my manager immediately."
        ),
        "synthetic_ground_truth": {
            "content_score": 2.0,
            "relevance_score": 3.0,
            "overall_score": 2.5,
            "rubric_coverage_ratio": 0.0
        },
        "is_synthetic": True,
        "split": "test"
    }
]
