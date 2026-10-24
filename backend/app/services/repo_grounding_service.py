"""
Repo & Resume Grounded Interview Service.

Ingests candidate's GitHub projects/code using Tree-Sitter AST parsing (Python, JavaScript, TypeScript)
and code embeddings with pgvector schema & cosine similarity vector search.
Cross-references candidate resume claims against code structures and generates
deep, anti-cheat architectural probing questions (e.g., "Why did you structure the cache this way?").
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

# Tree-sitter AST parsing imports
try:
    import tree_sitter
    from tree_sitter import Language, Parser
    import tree_sitter_python
    import tree_sitter_javascript
    import tree_sitter_typescript

    PY_LANG = Language(tree_sitter_python.language())
    JS_LANG = Language(tree_sitter_javascript.language())
    TS_LANG = Language(tree_sitter_typescript.language_typescript())
    TREE_SITTER_AVAILABLE = True
except Exception as e:
    TREE_SITTER_AVAILABLE = False
    PY_LANG = None
    JS_LANG = None
    TS_LANG = None

from .text_encoder import TextEncoder

logger = logging.getLogger(__name__)


# ----------------- Pre-seeded Representative Candidate Repositories -----------------

PRESEEDED_REPOS = [
    {
        "repo_id": "repo_cache_engine",
        "repo_name": "vivek-sharma/distributed-cache-engine",
        "primary_language": "python",
        "description": "High-throughput in-memory & Redis caching layer with probabilistic early refresh and distributed locking.",
        "files": [
            {
                "file_path": "src/cache/distributed_cache.py",
                "code": '''"""
Distributed Cache Manager with Mutex Stampede Prevention and XFetch probabilistic expiration.
"""
import time
import math
import random
import asyncio
from typing import Optional, Any, Callable

class DistributedCacheManager:
    """
    Manages local L1 memory cache and remote Redis L2 cluster with stampede protection.
    """
    def __init__(self, redis_client=None, default_ttl_sec: int = 300, jitter_pct: float = 0.15):
        self.redis = redis_client
        self.default_ttl = default_ttl_sec
        self.jitter_pct = jitter_pct
        self._local_l1_store = {}
        self._locks = {}

    def _calculate_jittered_ttl(self, ttl: int) -> int:
        delta = int(ttl * self.jitter_pct)
        return ttl + random.randint(-delta, delta)

    async def get_with_stampede_lock(self, key: str, compute_fn: Callable, ttl_sec: Optional[int] = None) -> Any:
        """
        Retrieves item from cache. On cache miss, acquires a distributed key-level lock
        to ensure only one concurrent worker recomputes from the primary database.
        """
        effective_ttl = self._calculate_jittered_ttl(ttl_sec or self.default_ttl)
        
        # Check local L1 memory
        if key in self._local_l1_store:
            entry = self._local_l1_store[key]
            if time.time() < entry["expires_at"]:
                return entry["data"]

        # Acquire lock to prevent thundering herd
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()

        async with self._locks[key]:
            # Double-check pattern after acquiring lock
            if key in self._local_l1_store and time.time() < self._local_l1_store[key]["expires_at"]:
                return self._local_l1_store[key]["data"]

            # Compute and repopulate
            computed_val = await compute_fn()
            self._local_l1_store[key] = {
                "data": computed_val,
                "expires_at": time.time() + effective_ttl,
                "computed_at": time.time()
            }
            return computed_val

    def invalidate_pattern(self, tag: str) -> int:
        """Invalidates all cached entries matching tag prefix."""
        to_delete = [k for k in self._local_l1_store if k.startswith(tag)]
        for k in to_delete:
            del self._local_l1_store[k]
        return len(to_delete)
'''
            }
        ],
        "resume_claims": [
            {
                "claim_id": "claim_cache_1",
                "claim_text": "Architected low-latency distributed caching layer with stampede protection handling 40,000 requests/sec with 99.8% cache hit rate.",
                "verified": True,
                "target_file": "src/cache/distributed_cache.py",
                "verified_ast_nodes": ["DistributedCacheManager", "get_with_stampede_lock", "_calculate_jittered_ttl"]
            },
            {
                "claim_id": "claim_cache_2",
                "claim_text": "Implemented multi-region Raft consensus for active-active cache invalidation.",
                "verified": False,
                "target_file": "src/cache/distributed_cache.py",
                "unverified_reason": "Code in `distributed_cache.py` uses single-process asyncio.Lock() and local dictionary prefix matching, with no Raft consensus or RPC replication."
            }
        ],
        "grounded_questions": [
            {
                "question_id": "gq_cache_structure",
                "title": "Why did you structure the cache this way in your project?",
                "category": "Cache Architecture & Concurrency",
                "target_file": "src/cache/distributed_cache.py",
                "line_range": "Lines 28-56",
                "question_text": "In `src/cache/distributed_cache.py`, why did you structure your cache stampede prevention using an in-memory `asyncio.Lock()` per key and double-checked locking, rather than an external Redis distributed mutex or a stale-while-revalidate background refresh?",
                "grounded_context": "The code uses `self._locks[key] = asyncio.Lock()` with a double-check pattern on `self._local_l1_store` and applies randomized TTL jitter via `_calculate_jittered_ttl`.",
                "key_code_constructs": ["asyncio.Lock()", "_calculate_jittered_ttl", "double-checked locking", "local L1 store", "effective_ttl"],
                "anti_cheat_rubric": [
                    "Must mention the local process lock trade-off: `asyncio.Lock` protects single-instance thundering herd with zero network overhead, but does NOT protect across multiple scaled worker pods.",
                    "Must explain the double-check locking pattern on line 42 (`if key in self._local_l1_store...`) to prevent redundant computation after waiting on lock.",
                    "Must explain why randomized TTL jitter (15%) was added to prevent synchronized cache cliffs.",
                    "Must articulate what happens under pod crash or restart."
                ],
                "exemplar_defense": {
                    "full_text": "I structured the cache with an in-memory asyncio.Lock and double-checked locking deliberately to prioritize sub-millisecond hot-path latency. When thousands of concurrent coroutines within the same worker pod request a newly expired key, acquiring an external Redis lock for every request introduces additional network roundtrips and Redis contention. By serializing coroutines locally first with asyncio.Lock, only one coroutine computes the value while others wait, and once unlocked, the double-check condition immediately returns the cached data. To mitigate simultaneous cache cliffs across entries, I added fifteen percent randomized TTL jitter. However, because this lock is process-local, in a multi-pod Kubernetes deployment each pod still executes one database query upon miss. To eliminate that across pods, the next iteration introduces a Redis SETNX lock with short lease expiration.",
                    "speech_segments": [
                        {
                            "text": "I structured the cache with an in-memory asyncio.Lock and double-checked locking deliberately to prioritize sub-millisecond hot-path latency.",
                            "pause_after_sec": 0.5,
                            "emphasis_words": ["asyncio.Lock", "double-checked locking", "sub-millisecond"]
                        },
                        {
                            "text": "When thousands of concurrent coroutines within the same worker pod request a newly expired key, acquiring an external Redis lock for every request introduces unnecessary network roundtrips.",
                            "pause_after_sec": 0.45,
                            "emphasis_words": ["worker pod", "network roundtrips"]
                        },
                        {
                            "text": "By serializing coroutines locally first, only one coroutine recomputes from the database while others wait, and the double-check condition immediately serves the fresh value.",
                            "pause_after_sec": 0.4,
                            "emphasis_words": ["double-check condition", "fresh value"]
                        },
                        {
                            "text": "To prevent synchronized expirations, I added fifteen percent randomized TTL jitter, though in a multi-pod deployment an external Redis distributed lock would be needed to coordinate across instances.",
                            "pause_after_sec": 0.6,
                            "emphasis_words": ["randomized TTL jitter", "multi-pod deployment"]
                        }
                    ]
                }
            },
            {
                "question_id": "gq_cache_invalidation",
                "title": "Cache Invalidation & Tag-based Prefix Deletion",
                "category": "Invalidation & Data Consistency",
                "target_file": "src/cache/distributed_cache.py",
                "line_range": "Lines 58-64",
                "question_text": "In `invalidate_pattern`, you iterate over all keys in `_local_l1_store` to delete matching prefix tags. Why did you implement invalidation as an O(N) linear scan, and what happens to memory and CPU when your cache grows to 500,000 keys?",
                "grounded_context": "The method executes `to_delete = [k for k in self._local_l1_store if k.startswith(tag)]` and deletes each matching key.",
                "key_code_constructs": ["invalidate_pattern", "k.startswith(tag)", "linear scan", "O(N) memory loop"],
                "anti_cheat_rubric": [
                    "Acknowledge that list comprehension over 500k dictionary keys blocks the Python event loop and introduces CPU spikes.",
                    "Propose alternative structure: Tag-to-key inverted index (Set of keys per tag) or generation-based versioning keys."
                ],
                "exemplar_defense": {
                    "full_text": "The O(N) linear scan was an explicit simplicity trade-off for our initial prototype where each service instance maintained fewer than five thousand keys. However, scaling to five hundred thousand keys creates an unacceptable event loop freeze because the list comprehension locks Python execution during the dictionary iteration. In production, I would replace this linear scan with a secondary inverted index mapping tag namespaces to sets of cache keys, or use generation version numbers in the key name so invalidation becomes an O(1) increment of the tag version.",
                    "speech_segments": [
                        {
                            "text": "The O(N) linear scan was an explicit simplicity trade-off for our initial prototype where each instance maintained fewer than five thousand keys.",
                            "pause_after_sec": 0.45,
                            "emphasis_words": ["simplicity trade-off", "five thousand keys"]
                        },
                        {
                            "text": "At five hundred thousand keys, iterating through the dictionary blocks the event loop and introduces significant latency spikes.",
                            "pause_after_sec": 0.4,
                            "emphasis_words": ["blocks the event loop", "latency spikes"]
                        },
                        {
                            "text": "To fix this, I would replace the scan with an inverted index mapping tags to key sets, or use generation-based key versioning for constant-time O(1) invalidation.",
                            "pause_after_sec": 0.5,
                            "emphasis_words": ["inverted index", "constant-time O(1)"]
                        }
                    ]
                }
            }
        ]
    },
    {
        "repo_id": "repo_order_pipeline",
        "repo_name": "vivek-sharma/event-driven-order-queue",
        "primary_language": "python",
        "description": "Async order processing pipeline with idempotency token validation and dead-letter queue routing.",
        "files": [
            {
                "file_path": "services/order_orchestrator.py",
                "code": '''"""
Async Order Processing Pipeline with Idempotency Validation and Dead-Letter Queue.
"""
import uuid
import time
import asyncio
from typing import Dict, Any

class OrderOrchestrator:
    def __init__(self, db_pool, payment_gateway, dlq_channel):
        self.db = db_pool
        self.payment_gateway = payment_gateway
        self.dlq = dlq_channel
        self.max_retries = 3

    async def process_order(self, order_id: str, idempotency_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes order processing with idempotency check.
        """
        # Step 1: Check existing transaction
        existing = await self.db.fetch_one("SELECT * FROM idempotency_keys WHERE token = $1", idempotency_key)
        if existing and existing["status"] == "COMPLETED":
            return {"status": "SUCCESS", "cached": True, "result": existing["response_payload"]}

        # Step 2: Lock key in PENDING state
        await self.db.execute(
            "INSERT INTO idempotency_keys (token, order_id, status, created_at) VALUES ($1, $2, 'PENDING', NOW()) "
            "ON CONFLICT (token) DO UPDATE SET status = 'PENDING'",
            idempotency_key, order_id
        )

        attempts = 0
        while attempts < self.max_retries:
            try:
                # Step 3: Call external payment provider
                payment_res = await self.payment_gateway.charge(
                    amount=payload["amount"],
                    currency=payload["currency"],
                    reference_id=idempotency_key
                )
                
                # Step 4: Mark COMPLETED
                await self.db.execute(
                    "UPDATE idempotency_keys SET status = 'COMPLETED', response_payload = $1 WHERE token = $2",
                    payment_res, idempotency_key
                )
                return {"status": "SUCCESS", "cached": False, "result": payment_res}
            except Exception as exc:
                attempts += 1
                if attempts >= self.max_retries:
                    await self.dlq.publish({"order_id": order_id, "error": str(exc), "payload": payload})
                    await self.db.execute("UPDATE idempotency_keys SET status = 'FAILED' WHERE token = $1", idempotency_key)
                    raise RuntimeError(f"Order failed after {self.max_retries} attempts: {exc}")
                await asyncio.sleep(2 ** attempts)
'''
            }
        ],
        "resume_claims": [
            {
                "claim_id": "claim_order_1",
                "claim_text": "Engineered idempotent payment orchestration pipeline handling $2M daily volume with zero duplicate charges.",
                "verified": True,
                "target_file": "services/order_orchestrator.py",
                "verified_ast_nodes": ["OrderOrchestrator", "process_order", "idempotency_key"]
            }
        ],
        "grounded_questions": [
            {
                "question_id": "gq_order_idempotency",
                "title": "Idempotency State Transitions & Gateway Timeout Vulnerability",
                "category": "Transactions & Fault Tolerance",
                "target_file": "services/order_orchestrator.py",
                "line_range": "Lines 25-54",
                "question_text": "In `services/order_orchestrator.py`, if the payment gateway charges the customer card but times out before returning an HTTP response to `process_order`, your retry loop catches the exception and sleeps before retrying. How does your pipeline prevent double-charging the customer when retrying a timed-out call?",
                "grounded_context": "The code passes `reference_id=idempotency_key` to `self.payment_gateway.charge(...)`, but marks the DB status as 'FAILED' if retries exhaust.",
                "key_code_constructs": ["idempotency_key", "payment_gateway.charge", "reference_id", "attempts < self.max_retries"],
                "anti_cheat_rubric": [
                    "Must identify that the external payment gateway receives `reference_id=idempotency_key`, so the gateway itself deduplicates duplicate charge requests.",
                    "Must address what happens if the network drops between app and database during completion update.",
                    "Must explain why a PENDING lease timeout is necessary so stuck requests don't block indefinitely."
                ],
                "exemplar_defense": {
                    "full_text": "Double-charging is prevented because we propagate the idempotency_key directly as the payment gateway's reference_id on line 36. When a gateway call times out downstream, the provider's API deduplicates any subsequent retry with that same reference token, ensuring the card is charged at most once. However, to handle edge cases where the payment succeeds but our database network drops before marking the key COMPLETED, we need a reconciliation worker that queries the gateway by reference_id before routing to the dead-letter queue.",
                    "speech_segments": [
                        {
                            "text": "Double-charging is prevented because we propagate the idempotency key directly as the payment gateway's reference ID.",
                            "pause_after_sec": 0.45,
                            "emphasis_words": ["idempotency key", "reference ID"]
                        },
                        {
                            "text": "When a gateway call times out, the provider's API deduplicates subsequent retries with that exact token, charging the card at most once.",
                            "pause_after_sec": 0.4,
                            "emphasis_words": ["deduplicates", "at most once"]
                        },
                        {
                            "text": "For safety if our database crashes right after payment, a reconciliation job queries the provider before publishing to the dead-letter queue.",
                            "pause_after_sec": 0.5,
                            "emphasis_words": ["reconciliation job", "dead-letter queue"]
                        }
                    ]
                }
            }
        ]
    }
]


# ----------------- Tree-Sitter AST & Semantic Extractor -----------------

class TreeSitterCodeExtractor:
    """
    Parses code using Tree-Sitter grammars for Python, JavaScript, and TypeScript,
    extracting structural AST nodes, symbols, and architectural patterns.
    """

    @classmethod
    def parse_code_ast(cls, code: str, language: str = "python") -> Dict[str, Any]:
        """
        Parses source code into structured AST symbols and architectural indicators.
        """
        lang_lower = language.lower()
        symbols = []
        classes = []
        functions = []
        architectural_patterns = []

        if TREE_SITTER_AVAILABLE:
            try:
                if "python" in lang_lower and PY_LANG:
                    parser = Parser(PY_LANG)
                    tree = parser.parse(code.encode("utf-8"))
                    cls._walk_python_tree(tree.root_node, code, symbols, classes, functions, architectural_patterns)
                elif ("javascript" in lang_lower or "js" in lang_lower) and JS_LANG:
                    parser = Parser(JS_LANG)
                    tree = parser.parse(code.encode("utf-8"))
                    cls._walk_js_tree(tree.root_node, code, symbols, classes, functions, architectural_patterns)
                elif ("typescript" in lang_lower or "ts" in lang_lower) and TS_LANG:
                    parser = Parser(TS_LANG)
                    tree = parser.parse(code.encode("utf-8"))
                    cls._walk_js_tree(tree.root_node, code, symbols, classes, functions, architectural_patterns)
                else:
                    cls._fallback_regex_extract(code, symbols, classes, functions, architectural_patterns)
            except Exception as exc:
                logger.warning(f"Tree-sitter parse failed, falling back to regex: {exc}")
                cls._fallback_regex_extract(code, symbols, classes, functions, architectural_patterns)
        else:
            cls._fallback_regex_extract(code, symbols, classes, functions, architectural_patterns)

        # Architectural pattern detection
        code_lower = code.lower()
        if "cache" in code_lower or "ttl" in code_lower or "redis" in code_lower:
            architectural_patterns.append({
                "category": "Caching Mechanism",
                "construct": "TTL & In-Memory/Redis Cache Layer",
                "risk_areas": ["Cache Stampede", "TTL Expiration Cliff", "Stale Reads"]
            })
        if "lock" in code_lower or "asyncio" in code_lower or "mutex" in code_lower or "thread" in code_lower:
            architectural_patterns.append({
                "category": "Concurrency & Synchronization",
                "construct": "Asynchronous Lock / Mutex Primitives",
                "risk_areas": ["Deadlocks", "Contention Overhead", "Cross-Pod Desynchronization"]
            })
        if "idempotency" in code_lower or "retry" in code_lower or "dlq" in code_lower:
            architectural_patterns.append({
                "category": "Distributed Reliability",
                "construct": "Idempotency Token & Dead Letter Queue",
                "risk_areas": ["Duplicate Processing", "Gateway Timeout Mismatch", "Ghost Writes"]
            })

        return {
            "language": language,
            "tree_sitter_engine": TREE_SITTER_AVAILABLE,
            "classes": classes,
            "functions": functions,
            "symbols_count": len(symbols),
            "symbols": symbols[:30],
            "architectural_patterns": architectural_patterns,
            "total_lines": len(code.splitlines())
        }

    @classmethod
    def _walk_python_tree(cls, node, code: str, symbols: list, classes: list, functions: list, patterns: list):
        if node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = code[name_node.start_byte:name_node.end_byte]
                start_line = node.start_point[0] + 1
                end_line = node.end_point[0] + 1
                classes.append({"name": name, "start_line": start_line, "end_line": end_line})
                symbols.append({"type": "class", "name": name, "start_line": start_line, "end_line": end_line})
        elif node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = code[name_node.start_byte:name_node.end_byte]
                start_line = node.start_point[0] + 1
                end_line = node.end_point[0] + 1
                functions.append({"name": name, "start_line": start_line, "end_line": end_line})
                symbols.append({"type": "function", "name": name, "start_line": start_line, "end_line": end_line})

        for child in node.children:
            cls._walk_python_tree(child, code, symbols, classes, functions, patterns)

    @classmethod
    def _walk_js_tree(cls, node, code: str, symbols: list, classes: list, functions: list, patterns: list):
        if node.type in ("class_declaration", "class"):
            name_node = node.child_by_field_name("name")
            if name_node:
                name = code[name_node.start_byte:name_node.end_byte]
                classes.append({"name": name, "start_line": node.start_point[0] + 1, "end_line": node.end_point[0] + 1})
        elif node.type in ("function_declaration", "method_definition"):
            name_node = node.child_by_field_name("name")
            if name_node:
                name = code[name_node.start_byte:name_node.end_byte]
                functions.append({"name": name, "start_line": node.start_point[0] + 1, "end_line": node.end_point[0] + 1})

        for child in node.children:
            cls._walk_js_tree(child, code, symbols, classes, functions, patterns)

    @classmethod
    def _fallback_regex_extract(cls, code: str, symbols: list, classes: list, functions: list, patterns: list):
        lines = code.splitlines()
        for idx, line in enumerate(lines):
            line_no = idx + 1
            # Python def / class
            py_class = re.match(r"^\s*class\s+([A-Za-z0-9_]+)", line)
            if py_class:
                classes.append({"name": py_class.group(1), "start_line": line_no, "end_line": line_no + 10})
                symbols.append({"type": "class", "name": py_class.group(1), "start_line": line_no})
            py_func = re.match(r"^\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)", line)
            if py_func:
                functions.append({"name": py_func.group(1), "start_line": line_no, "end_line": line_no + 8})
                symbols.append({"type": "function", "name": py_func.group(1), "start_line": line_no})


# ----------------- Code Embeddings & pgvector Semantic Indexer -----------------

class PgVectorCodeIndexer:
    """
    Chunks repository code by AST units and produces 384-dimensional dense embeddings
    using Sentence-BERT with pgvector schema & cosine distance retrieval.
    """

    @classmethod
    def index_repo_files(cls, files: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Extracts code chunks, computes embeddings via TextEncoder, and prepares pgvector records.
        """
        encoder = TextEncoder.get_instance()
        chunks = []

        for f in files:
            path = f.get("file_path", "unknown.py")
            code = f.get("code", "")
            lines = code.splitlines()

            # Chunk by semantic blocks or 30-line windows
            chunk_size = 30
            for i in range(0, max(1, len(lines)), 20):
                window = lines[i:i + chunk_size]
                chunk_text = "\n".join(window)
                if len(chunk_text.strip()) < 20:
                    continue
                chunks.append({
                    "chunk_id": f"{path}:L{i+1}-L{i+len(window)}",
                    "file_path": path,
                    "line_start": i + 1,
                    "line_end": i + len(window),
                    "code_text": chunk_text
                })

        if not chunks:
            return {"chunks_indexed": 0, "records": []}

        texts = [f"File {c['file_path']} lines {c['line_start']}-{c['line_end']}:\n{c['code_text']}" for c in chunks]
        embeddings = encoder.encode(texts)

        records = []
        for c, emb in zip(chunks, embeddings):
            c["embedding"] = emb.tolist()
            c["embedding_dim"] = len(emb)
            records.append(c)

        # pgvector DDL documentation
        pgvector_ddl = """
        -- Production pgvector DDL schema for Repo Code Embeddings
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS candidate_code_embeddings (
            chunk_id VARCHAR(255) PRIMARY KEY,
            repo_id VARCHAR(100) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            line_start INT NOT NULL,
            line_end INT NOT NULL,
            code_text TEXT NOT NULL,
            embedding vector(384)
        );
        CREATE INDEX IF NOT EXISTS code_embedding_hnsw_idx 
        ON candidate_code_embeddings USING hnsw (embedding vector_cosine_ops);
        """

        return {
            "chunks_indexed": len(records),
            "vector_dimension": 384,
            "pgvector_ddl": pgvector_ddl.strip(),
            "records": records
        }

    @classmethod
    def semantic_code_search(cls, query: str, indexed_records: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Searches indexed code chunks using cosine similarity.
        """
        if not indexed_records:
            return []

        encoder = TextEncoder.get_instance()
        q_emb = encoder.encode([query])[0]

        results = []
        for r in indexed_records:
            emb = np.array(r["embedding"], dtype=np.float32)
            denom = (np.linalg.norm(q_emb) * np.linalg.norm(emb)) + 1e-8
            sim = float(np.dot(q_emb, emb) / denom)
            results.append({
                "chunk_id": r["chunk_id"],
                "file_path": r["file_path"],
                "line_start": r["line_start"],
                "line_end": r["line_end"],
                "similarity_score": round(sim, 4),
                "code_snippet": r["code_text"][:250] + "..."
            })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]


# ----------------- Grounded Assessment & Anti-Cheat Engine -----------------

class RepoGroundedAssessmentService:
    """
    Evaluates candidate spoken or written answers against the exact repository AST ground-truth,
    detecting generic AI-assistant canned responses and scoring grounding fidelity.
    """

    @classmethod
    def get_available_repos(cls) -> List[Dict[str, Any]]:
        """Returns pre-indexed repositories with AST summaries and sample questions."""
        results = []
        for repo in PRESEEDED_REPOS:
            files_summary = []
            for f in repo["files"]:
                ast_info = TreeSitterCodeExtractor.parse_code_ast(f["code"], repo["primary_language"])
                files_summary.append({
                    "file_path": f["file_path"],
                    "classes": ast_info["classes"],
                    "functions": ast_info["functions"],
                    "total_lines": ast_info["total_lines"],
                    "patterns": ast_info["architectural_patterns"],
                    "code_preview": "\n".join(f["code"].splitlines()[:25])
                })
            results.append({
                "repo_id": repo["repo_id"],
                "repo_name": repo["repo_name"],
                "primary_language": repo["primary_language"],
                "description": repo["description"],
                "files": files_summary,
                "resume_claims": repo["resume_claims"],
                "grounded_questions": repo["grounded_questions"]
            })
        return results

    @classmethod
    def parse_custom_repo(cls, repo_name: str, primary_language: str, code_content: str, file_path: str = "main.py") -> Dict[str, Any]:
        """
        Parses a custom repository/file provided by candidate in real time with Tree-Sitter,
        generates code embeddings, and creates grounded questions.
        """
        ast_info = TreeSitterCodeExtractor.parse_code_ast(code_content, primary_language)
        indexed = PgVectorCodeIndexer.index_repo_files([{"file_path": file_path, "code": code_content}])

        # Generate custom questions based on detected AST constructs
        generated_questions = []
        for fn in ast_info["functions"]:
            generated_questions.append({
                "question_id": f"gq_custom_{fn['name']}",
                "title": f"Design & Structure of `{fn['name']}`",
                "category": "Custom Code Structure",
                "target_file": file_path,
                "line_range": f"Lines {fn['start_line']}-{fn['end_line']}",
                "question_text": f"In `{file_path}` lines {fn['start_line']} to {fn['end_line']}, why did you structure `{fn['name']}` this way in your project? What architectural trade-offs did you make regarding error handling and concurrency?",
                "grounded_context": f"Function `{fn['name']}` defined in `{file_path}`.",
                "key_code_constructs": [fn["name"]],
                "anti_cheat_rubric": [
                    f"Must explain the internal logic and design decisions of `{fn['name']}`.",
                    "Must discuss specific failure modes rather than generic theory."
                ],
                "exemplar_defense": {
                    "full_text": f"In structuring {fn['name']}, I intentionally favored modular separation and clear exception boundaries. The function isolates execution so that transient failures don't cascade up the call stack, trading a small invocation overhead for predictability in production.",
                    "speech_segments": [
                        {
                            "text": f"In structuring {fn['name']}, I intentionally favored modular separation and clear exception boundaries.",
                            "pause_after_sec": 0.5,
                            "emphasis_words": [fn["name"], "modular separation"]
                        }
                    ]
                }
            })

        return {
            "repo_id": f"custom_{re.sub(r'[^a-zA-Z0-9]', '_', repo_name).lower()}",
            "repo_name": repo_name,
            "primary_language": primary_language,
            "file_path": file_path,
            "ast_analysis": ast_info,
            "vector_indexing": {
                "chunks_count": indexed["chunks_indexed"],
                "vector_dimension": indexed["vector_dimension"],
                "pgvector_schema_ready": True
            },
            "generated_questions": generated_questions[:4]
        }

    @classmethod
    def evaluate_grounded_answer(
        cls,
        question_id: str,
        candidate_answer: str,
        repo_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates the candidate's answer against the repo code ground truth and anti-cheat indicators.
        """
        # Find question definition
        target_q = None
        target_repo = None
        for repo in PRESEEDED_REPOS:
            for q in repo["grounded_questions"]:
                if q["question_id"] == question_id:
                    target_q = q
                    target_repo = repo
                    break
            if target_q:
                break

        if not target_q:
            # Fallback placeholder question
            target_q = PRESEEDED_REPOS[0]["grounded_questions"][0]
            target_repo = PRESEEDED_REPOS[0]

        ans_lower = candidate_answer.lower()
        key_constructs = target_q.get("key_code_constructs", [])

        # 1. Grounded Code Fidelity Score
        def _matches_construct(c: str, text: str) -> bool:
            clean_c = c.lower().replace("()", "").strip()
            if clean_c in text or c.lower() in text:
                return True
            parts = [p for p in clean_c.replace("_", " ").split() if len(p) > 2]
            if parts and all(p in text for p in parts):
                return True
            return False

        matched_constructs = [c for c in key_constructs if _matches_construct(c, ans_lower)]
        construct_ratio = len(matched_constructs) / max(1, len(key_constructs))

        # Semantic alignment with ground-truth exemplar
        encoder = TextEncoder.get_instance()
        exemplar_text = target_q["exemplar_defense"]["full_text"]
        embs = encoder.encode([candidate_answer, exemplar_text])
        denom = (np.linalg.norm(embs[0]) * np.linalg.norm(embs[1])) + 1e-8
        semantic_sim = float(np.dot(embs[0], embs[1]) / denom)

        # Grounding score combines concrete construct citations with semantic trade-off alignment
        grounding_score = round(float(np.clip((construct_ratio * 45) + (semantic_sim * 55) + 5, 10, 98)), 1)


        # 2. Anti-Cheat & Generic AI Assistant Detection
        # Hallmark of generic AI assistance: highly generic terminology, absence of specific variable/method citations
        generic_ai_markers = [
            "generally speaking", "it is best practice to", "in software development",
            "caching is an important concept", "depending on the requirements",
            "there are several ways to do this", "in conclusion"
        ]
        has_generic_markers = sum(1 for m in generic_ai_markers if m in ans_lower)
        lacks_specifics = (len(matched_constructs) == 0 and len(candidate_answer.split()) > 35)

        if lacks_specifics or has_generic_markers >= 2:
            ai_evasion_risk = "High"
            ai_evasion_score = 78.5
            anti_cheat_note = "Candidate provided a generic textbook explanation that fails to cite their own repo structures, method names, or line-level trade-offs. Typical signature of unprompted AI assistant (e.g. ChatGPT) output."
        elif len(matched_constructs) == 1:
            ai_evasion_risk = "Moderate"
            ai_evasion_score = 42.0
            anti_cheat_note = "Candidate cited high-level concept but missed specific lock mechanics and double-check conditions present in the repo code."
        else:
            ai_evasion_risk = "Low"
            ai_evasion_score = 12.0
            anti_cheat_note = "Strong authentic defense. Candidate specifically referenced exact variables, internal lock behaviors, and acknowledged production architectural constraints."

        # 3. Architectural Defense Rating
        trade_off_words = ["trade-off", "latency", "contention", "event loop", "thundering herd", "lock", "staleness", "jitter"]
        trade_offs_hit = sum(1 for w in trade_off_words if w in ans_lower)
        defense_score = round(float(np.clip(50 + (trade_offs_hit * 8) + (semantic_sim * 25), 20, 99)), 1)

        # 4. Pinpointed Missing Code Deficits
        pinpointed_deficits = []
        for construct in key_constructs:
            if construct.lower() not in ans_lower:
                pinpointed_deficits.append({
                    "type": "unmentioned_code_construct",
                    "construct": construct,
                    "location": f"{target_q['target_file']} ({target_q['line_range']})",
                    "severity": "high",
                    "feedback": f"Did not mention `{construct}` which is the core structural primitive in your repository code."
                })

        # 5. Targeted Interview Drills
        targeted_drills = [
            {
                "title": "Grounding in Concrete File & Line References",
                "duration": "2 mins",
                "instructions": f"Practice answering by starting with: 'In {target_q['target_file']}, I explicitly wrote {key_constructs[0] if key_constructs else 'this module'} because...'"
            },
            {
                "title": "Articulating Multi-Instance Trade-offs",
                "duration": "2 mins",
                "instructions": "Clearly distinguish single-process memory locks from distributed locks across scaled pods."
            }
        ]

        return {
            "question_id": target_q["question_id"],
            "question_title": target_q["title"],
            "target_file": target_q["target_file"],
            "line_range": target_q["line_range"],
            "candidate_transcript": candidate_answer,
            "grounding_fidelity_score": grounding_score,
            "anti_cheat_analysis": {
                "ai_evasion_risk": ai_evasion_risk,
                "ai_evasion_score": ai_evasion_score,
                "diagnostic_note": anti_cheat_note,
                "matched_repo_constructs": matched_constructs,
                "missing_repo_constructs": [c for c in key_constructs if c not in matched_constructs]
            },
            "architectural_defense_score": defense_score,
            "rubric_breakdown": [
                {
                    "criterion": "Repo Code Grounding",
                    "score": grounding_score,
                    "status": "PASS" if grounding_score >= 70 else "NEEDS_IMPROVEMENT",
                    "weight": 0.4
                },
                {
                    "criterion": "Anti-Cheat Specificity",
                    "score": round(100 - ai_evasion_score, 1),
                    "status": "PASS" if ai_evasion_score < 40 else "SUSPICIOUS",
                    "weight": 0.35
                },
                {
                    "criterion": "Trade-off Defense Depth",
                    "score": defense_score,
                    "status": "PASS" if defense_score >= 75 else "NEEDS_IMPROVEMENT",
                    "weight": 0.25
                }
            ],
            "pinpointed_deficits": pinpointed_deficits,
            "targeted_drills": targeted_drills,
            "exemplar_defense": target_q["exemplar_defense"]
        }
