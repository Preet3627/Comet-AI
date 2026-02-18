import asyncio
from asyncio import Task
from typing import Any, Callable, Coroutine, Optional


class ConcurrentService:
    def __init__(self):
        self._background_tasks = set[Task]()

    def run_task(
        self,
        delay: Optional[int],
        callable: Callable[..., Coroutine[Any, Any, Any]],
        *args,
        **kwargs,
    ):
        async def wrapper():
            if delay:
                await asyncio.sleep(delay)
            await callable(*args, **kwargs)

        task = asyncio.create_task(wrapper())

        print(f"Running task: {task} - executing {callable.__name__}")

        self._background_tasks.add(task)
        task.add_done_callback(self.on_task_done)

    def on_task_done(self, task: Task):
        print(f"Task done: {task}")

        self._background_tasks.discard(task)


CONCURRENT_SERVICE = ConcurrentService()
