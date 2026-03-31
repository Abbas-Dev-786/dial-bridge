import asyncio
import functools

def async_task(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            # For environments with a running loop (like some testing setups or gevent)
            future = asyncio.run_coroutine_threadsafe(f(*args, **kwargs), loop)
            return future.result()
        else:
            return loop.run_until_complete(f(*args, **kwargs))
    return wrapper
