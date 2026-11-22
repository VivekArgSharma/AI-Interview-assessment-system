import os
import shutil
import subprocess
import tempfile
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/code", tags=["Code Execution"])

class TestCaseInput(BaseModel):
    input: str = ""
    expected_output: str = ""

class ExecuteCppRequest(BaseModel):
    code: str = Field(..., min_length=1, description="C++ source code to compile and execute")
    test_cases: List[TestCaseInput] = Field(default_factory=list, description="Array of test cases with input and expected output")
    timeout_seconds: float = Field(default=4.0, ge=0.5, le=15.0)

class TestCaseResult(BaseModel):
    test_index: int
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    runtime_ms: float
    error_message: Optional[str] = None

class CppExecutionResponse(BaseModel):
    compilation_success: bool
    compiler_output: str
    total_tests: int
    passed_tests: int
    all_passed: bool
    results: List[TestCaseResult]


def find_cpp_compiler() -> str:
    """Finds available g++ compiler on the host system."""
    # Check PATH first
    gpp_on_path = shutil.which("g++")
    if gpp_on_path:
        return gpp_on_path
    
    # Common Windows MSYS2 / MinGW installation paths
    candidates = [
        r"C:\msys64\ucrt64\bin\g++.exe",
        r"C:\msys64\mingw64\bin\g++.exe",
        r"C:\MinGW\bin\g++.exe"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
            
    return "g++"


@router.post("/run-cpp", response_model=CppExecutionResponse)
def run_cpp_code(request: ExecuteCppRequest):
    """
    Compiles candidate C++ code using GCC/G++ with C++20 and runs against provided test cases.
    Captures compiler errors, execution outputs, runtimes, and validates expected answers.
    """
    gpp_path = find_cpp_compiler()

    with tempfile.TemporaryDirectory() as tmp_dir:
        src_file = os.path.join(tmp_dir, "solution.cpp")
        exe_file = os.path.join(tmp_dir, "solution.exe")

        with open(src_file, "w", encoding="utf-8") as f:
            f.write(request.code)

        # 1. Compile C++ Code
        try:
            compile_proc = subprocess.run(
                [gpp_path, "-O2", "-std=c++20", src_file, "-o", exe_file],
                capture_output=True,
                text=True,
                timeout=10.0
            )
        except subprocess.TimeoutExpired:
            return CppExecutionResponse(
                compilation_success=False,
                compiler_output="Compilation timed out (> 10 seconds). Check for circular preprocessor includes.",
                total_tests=len(request.test_cases),
                passed_tests=0,
                all_passed=False,
                results=[]
            )
        except FileNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"C++ compiler (g++) was not found at '{gpp_path}'. Please install MinGW/GCC."
            )

        if compile_proc.returncode != 0:
            # Clean up compiler messages: hide absolute temp file paths for cleaner UI
            clean_err = compile_proc.stderr.replace(src_file, "solution.cpp")
            return CppExecutionResponse(
                compilation_success=False,
                compiler_output=clean_err.strip() or "Compilation failed with unknown error.",
                total_tests=len(request.test_cases),
                passed_tests=0,
                all_passed=False,
                results=[]
            )

        # 2. Run Test Cases
        test_results: List[TestCaseResult] = []
        passed_count = 0

        # If no test cases were provided, execute once with empty input to verify runtime
        cases_to_run = request.test_cases if request.test_cases else [TestCaseInput(input="", expected_output="")]

        for idx, tc in enumerate(cases_to_run):
            t_start = time.perf_counter()
            err_msg: Optional[str] = None
            actual_out = ""
            passed = False

            try:
                run_proc = subprocess.run(
                    [exe_file],
                    input=tc.input,
                    capture_output=True,
                    text=True,
                    timeout=request.timeout_seconds
                )
                t_end = time.perf_counter()
                runtime_ms = round((t_end - t_start) * 1000.0, 2)
                actual_out = run_proc.stdout

                if run_proc.returncode != 0:
                    err_msg = f"Runtime Error (Exit Code {run_proc.returncode}): {run_proc.stderr.strip()}"
                else:
                    # Normalize whitespace for comparison
                    normalized_actual = actual_out.strip().replace("\r\n", "\n")
                    normalized_expected = tc.expected_output.strip().replace("\r\n", "\n")

                    if request.test_cases:
                        passed = (normalized_actual == normalized_expected)
                    else:
                        passed = True  # Single smoke test without explicit expected output
            except subprocess.TimeoutExpired:
                t_end = time.perf_counter()
                runtime_ms = round((t_end - t_start) * 1000.0, 2)
                err_msg = f"Time Limit Exceeded (> {request.timeout_seconds}s). Possible infinite loop."
                actual_out = ""
                passed = False
            except Exception as ex:
                t_end = time.perf_counter()
                runtime_ms = round((t_end - t_start) * 1000.0, 2)
                err_msg = f"Execution Exception: {str(ex)}"
                actual_out = ""
                passed = False

            if passed:
                passed_count += 1

            test_results.append(
                TestCaseResult(
                    test_index=idx + 1,
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output=actual_out.strip(),
                    passed=passed,
                    runtime_ms=runtime_ms,
                    error_message=err_msg
                )
            )

        return CppExecutionResponse(
            compilation_success=True,
            compiler_output="Compilation succeeded without errors.",
            total_tests=len(cases_to_run),
            passed_tests=passed_count,
            all_passed=(passed_count == len(cases_to_run)),
            results=test_results
        )


@router.get("/sample-challenges")
def get_sample_coding_challenges():
    """
    Returns the two canonical C++ technical challenges:
    1. C++ Bug Fix (Iterator Invalidation & Off-by-one boundary)
    2. C++ LeetCode Problem (Maximum Subarray Sum - Kadane's Algorithm)
    """
    return {
        "bug_fix": {
            "title": "Fix Iterator Invalidation & Off-by-One in Event Deduplicator",
            "stage": "Live C++ Debugging (Bug Fix)",
            "question_text": (
                "The C++ function below is supposed to filter out all records with values less than a threshold. "
                "However, it contains a critical iterator invalidation bug and an off-by-one bounds check causing "
                "segmentation faults and skipped items. Fix the function so all test cases execute cleanly."
            ),
            "starter_code": (
                "#include <iostream>\n"
                "#include <vector>\n\n"
                "// BUG: Erasing elements while incrementing iterator causes skips and out-of-bounds\n"
                "std::vector<int> removeStaleAndDeduplicate(std::vector<int>& records, int threshold) {\n"
                "    std::vector<int> result = records;\n"
                "    for (size_t i = 0; i <= result.size(); ++i) {\n"
                "        if (i < result.size() && result[i] < threshold) {\n"
                "            result.erase(result.begin() + i);\n"
                "        }\n"
                "    }\n"
                "    return result;\n"
                "}\n\n"
                "int main() {\n"
                "    int n, threshold;\n"
                "    if (!(std::cin >> n >> threshold)) return 0;\n"
                "    std::vector<int> records(n);\n"
                "    for (int i = 0; i < n; ++i) {\n"
                "        std::cin >> records[i];\n"
                "    }\n"
                "    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);\n"
                "    for (size_t i = 0; i < filtered.size(); ++i) {\n"
                "        std::cout << filtered[i] << (i + 1 == filtered.size() ? \"\" : \" \");\n"
                "    }\n"
                "    std::cout << \"\\n\";\n"
                "    return 0;\n"
                "}\n"
            ),
            "correct_code": (
                "#include <iostream>\n"
                "#include <vector>\n\n"
                "std::vector<int> removeStaleAndDeduplicate(const std::vector<int>& records, int threshold) {\n"
                "    std::vector<int> result;\n"
                "    for (int val : records) {\n"
                "        if (val >= threshold) {\n"
                "            result.push_back(val);\n"
                "        }\n"
                "    }\n"
                "    return result;\n"
                "}\n\n"
                "int main() {\n"
                "    int n, threshold;\n"
                "    if (!(std::cin >> n >> threshold)) return 0;\n"
                "    std::vector<int> records(n);\n"
                "    for (int i = 0; i < n; ++i) {\n"
                "        std::cin >> records[i];\n"
                "    }\n"
                "    std::vector<int> filtered = removeStaleAndDeduplicate(records, threshold);\n"
                "    for (size_t i = 0; i < filtered.size(); ++i) {\n"
                "        std::cout << filtered[i] << (i + 1 == filtered.size() ? \"\" : \" \");\n"
                "    }\n"
                "    std::cout << \"\\n\";\n"
                "    return 0;\n"
                "}\n"
            ),
            "test_cases": [
                {"input": "5 10\n5 12 8 15 20", "expected_output": "12 15 20"},
                {"input": "4 25\n5 10 15 20", "expected_output": ""},
                {"input": "3 1\n1 2 3", "expected_output": "1 2 3"}
            ]
        },
        "leetcode": {
            "title": "Maximum Subarray Sum (Kadane's Algorithm)",
            "stage": "Algorithms & Data Structures (LeetCode)",
            "question_text": (
                "Given an integer array `nums`, find the contiguous subarray (containing at least one number) "
                "which has the largest sum and return its sum. Implement an optimal O(N) time and O(1) space solution in C++."
            ),
            "starter_code": (
                "#include <iostream>\n"
                "#include <vector>\n"
                "#include <algorithm>\n\n"
                "// Implement Kadane's Algorithm in C++: O(N) time, O(1) auxiliary space\n"
                "long long maxSubArraySum(const std::vector<int>& nums) {\n"
                "    // TODO: Write your solution here\n"
                "    return 0;\n"
                "}\n\n"
                "int main() {\n"
                "    int n;\n"
                "    if (!(std::cin >> n)) return 0;\n"
                "    std::vector<int> nums(n);\n"
                "    for (int i = 0; i < n; ++i) {\n"
                "        std::cin >> nums[i];\n"
                "    }\n"
                "    std::cout << maxSubArraySum(nums) << \"\\n\";\n"
                "    return 0;\n"
                "}\n"
            ),
            "correct_code": (
                "#include <iostream>\n"
                "#include <vector>\n"
                "#include <algorithm>\n\n"
                "long long maxSubArraySum(const std::vector<int>& nums) {\n"
                "    if (nums.empty()) return 0;\n"
                "    long long current_sum = nums[0];\n"
                "    long long max_sum = nums[0];\n"
                "    for (size_t i = 1; i < nums.size(); ++i) {\n"
                "        current_sum = std::max((long long)nums[i], current_sum + nums[i]);\n"
                "        max_sum = std::max(max_sum, current_sum);\n"
                "    }\n"
                "    return max_sum;\n"
                "}\n\n"
                "int main() {\n"
                "    int n;\n"
                "    if (!(std::cin >> n)) return 0;\n"
                "    std::vector<int> nums(n);\n"
                "    for (int i = 0; i < n; ++i) {\n"
                "        std::cin >> nums[i];\n"
                "    }\n"
                "    std::cout << maxSubArraySum(nums) << \"\\n\";\n"
                "    return 0;\n"
                "}\n"
            ),
            "test_cases": [
                {"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6"},
                {"input": "5\n5 4 -1 7 8", "expected_output": "23"},
                {"input": "1\n-1", "expected_output": "-1"}
            ]
        }
    }
