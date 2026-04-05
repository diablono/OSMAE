import subprocess
import json
import time

def test_aios_kernel():
    print("--- [TEST] KHỞI CHẠY NHÂN AIOS KERNEL ---")
    
    # Start the kernel as a subprocess with pipe for communication
    kernel_proc = subprocess.Popen(
        ['python', 'backend/ai_kernel.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for startup
    time.sleep(1)
    
    # 🧪 Task 1: Gửi yêu cầu từ Agent Alpha
    task1 = json.dumps({"agent_id": "Agent_Alpha", "action": "query", "payload": "Chào AIKO!"})
    print(f">> Gửi Task 1 (Agent_Alpha): {task1}")
    kernel_proc.stdin.write(task1 + '\n')
    kernel_proc.stdin.flush()
    
    # 🧪 Task 2: Gửi yêu cầu từ Agent Beta (Đồng thời)
    task2 = json.dumps({"agent_id": "Agent_Beta", "action": "tool_call", "payload": {"tool": "disk_info", "args": ""}})
    print(f">> Gửi Task 2 (Agent_Beta): {task2}")
    kernel_proc.stdin.write(task2 + '\n')
    kernel_proc.stdin.flush()
    
    # 🔍 Chờ và đọc kết quả từ Kernel (Nên có độ trễ do delay giả lập trong kernel)
    print("\n--- Đang chờ AIOS Kernel điều phối và phản hồi... ---")
    
    for i in range(2):
        response = kernel_proc.stdout.readline().strip()
        if response:
            try:
                res_obj = json.loads(response)
                print(f"<< [PHẢN HỒI {i+1}] Từ Agent {res_obj['agent_id']}: {res_obj['response']['type']}")
                print(f"   Dữ liệu: {res_obj['response']}")
            except json.JSONDecodeError:
                print(f"<< [RAW] {response}")
        else:
            print(".. Không thấy dữ liệu mới.")
        time.sleep(2) # Chờ scheduler xử lý agent tiếp theo

    # Dọn dẹp
    kernel_proc.terminate()
    print("\n--- [TEST] KẾT THÚC KIỂM TRA LOGIC ---")

if __name__ == "__main__":
    test_aios_kernel()
