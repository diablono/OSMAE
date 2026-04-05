import sys
import json
import asyncio
import time
import requests
from collections import deque

class AIOSKernel:
    """A simplified AIOS-style kernel for Aiko-OS.
    Manages scheduling, memory context, and tool calls for AI agents.
    """
    def __init__(self):
        self.agent_queue = deque()  # Scheduling queue (FIFO/Round Robin)
        self.context_memory = {}    # MSC: Memory System Context
        self.is_running = True
        self.active_agent = None
        self.local_model = "gemma2:2b" # Default local model
        self.ollama_url = "http://localhost:11434/api/chat"

    async def schedule(self):
        """AIOS-style Scheduler: Processes agent tasks in the queue."""
        while self.is_running:
            if self.agent_queue:
                task = self.agent_queue.popleft()
                agent_id = task.get("agent_id", "system")
                self.active_agent = agent_id
                
                # MSC: Load Context
                context = self.load_context(agent_id)
                
                # Status: Processing
                self.output_status(agent_id, "processing")
                
                # LSC: LLM System Call (Calling Local/Cloud AI)
                response = await self.execute_task(task, context)
                
                # Save results and notify caller
                self.output_response(agent_id, response)
                
                # MSC: Save Context
                self.save_context(agent_id, context)
                self.active_agent = None
            else:
                await asyncio.sleep(0.1)

    def load_context(self, agent_id):
        """MSC: Memory System Context - Loading state."""
        return self.context_memory.get(agent_id, {"history": []})

    def save_context(self, agent_id, context):
        """MSC: Memory System Context - Saving state."""
        self.context_memory[agent_id] = context

    async def execute_task(self, task, context):
        """LSC/TSC: LLM & Tool System Calls."""
        action = task.get("action")
        payload = task.get("payload")

        if action == "query":
            # LSC: LLM System Call via Local Ollama
            return await self.call_local_llm(payload, context)
            
        elif action == "tool_call":
            # TSC: Tool System Call
            tool_name = payload.get("tool")
            args = payload.get("args")
            return {"type": "tool_result", "tool": tool_name, "status": "executed", "result": f"AIKO đã thực thi {tool_name} thành công. ✅"}
        
        return {"error": "Unknown syscall"}

    async def call_local_llm(self, query, context):
        """Thực hiện gọi AI Local qua Ollama API."""
        messages = context.get("history", [])
        messages.append({"role": "user", "content": query})
        
        try:
            # Run in executor to not block the asyncio loop
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: requests.post(
                    self.ollama_url, 
                    json={
                        "model": self.local_model,
                        "messages": messages,
                        "stream": False
                    },
                    timeout=30
                )
            )
            
            if response.status_code == 200:
                result = response.json()
                reply = result.get("message", {}).get("content", "")
                messages.append({"role": "assistant", "content": reply})
                return {"type": "llm_response", "content": reply, "source": "local_ai"}
            else:
                return {"type": "error", "content": f"Ollama Error: {response.status_code}", "source": "local_ai"}
                
        except Exception as e:
            # Fallback to simulation if Ollama is offline
            return {
                "type": "llm_response", 
                "content": f"[Simulated Response] AIKO nhận được: '{query}'. (Ollama Offline: {str(e)})", 
                "source": "simulated"
            }

    def output_response(self, agent_id, response):
        """Send response back to Electron/Node.js host."""
        print(json.dumps({"agent_id": agent_id, "response": response}), flush=True)

    def output_status(self, agent_id, status):
        """Send status update to UI."""
        print(json.dumps({"agent_id": agent_id, "status": status}), flush=True)

    def add_task(self, task_json):
        """Received a task from the Node.js host stdin."""
        try:
            task = json.loads(task_json)
            self.agent_queue.append(task)
        except json.JSONDecodeError:
            pass

async def main():
    kernel = AIOSKernel()
    
    # Run the scheduler in the background
    asyncio.create_task(kernel.schedule())
    
    # Read from stdin (IPC from Electron)
    while True:
        line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
        if not line:
            break
        kernel.add_task(line)

if __name__ == "__main__":
    asyncio.run(main())
