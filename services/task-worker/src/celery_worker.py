from celery import Celery
from redis import Redis
import os
import json
import time
import logging as logger

logger.basicConfig(level=logger.INFO)


redis_host = os.getenv('REDIS_HOST', 'redis')
redis_port = os.getenv('REDIS_PORT', 6379)
redis_db = os.getenv('REDIS_DB', 0)
# Define the Celery application
redis_url = f'redis://{redis_host}:{redis_port}/{redis_db}'
app = Celery(
    'tasks',
    backend=redis_url,
    broker=redis_url
)

# Define a Celery task
@app.task
def process_message(message):
    logger.info('Processing message: %s', message)
    message = json.loads(message)

    logger.info('Processing message: %s', message)
    target_channel = 'task_worker_messages'
    redis_client = Redis(host=redis_host, port=redis_port, db=redis_db)

    sid = message.get('sid')

    base_status_message = {
        "sid": sid,
        "type": "status"
    }
    status_message = {
        **base_status_message,
        "text": "Working on your request, please wait..."
    }
    logger.info('Status message: %s', status_message)
    redis_client.publish(target_channel, json.dumps(status_message))
    time.sleep(10)

    status_message = {
        **base_status_message,
        "text": "Update #2 using an additional source."
    }
    logger.info('Update message: %s', status_message)
    redis_client.publish(target_channel, json.dumps(status_message))
    time.sleep(10)

    complete_message = {
        "sid": sid,
        "type": "response",
        "text": "Final answer is yes"
    }
    logger.info('Update message: %s', complete_message)
    redis_client.publish(target_channel, json.dumps(complete_message))

    return message


if __name__ == "__main__":
    argv = [
        'worker',
        '--loglevel=DEBUG',
        '--concurrency=4'
    ]
    app.worker_main(argv)