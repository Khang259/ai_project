"""
AGV Spam Cleanup Scheduler Module
Chứa các scheduled tasks để dọn dẹp spam log của task_service
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import time
import sys
import os

# Đảm bảo path đúng
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.logging import get_logger
from app.services.task_service import task_service   # <--- Import service của bạn

logger = get_logger("camera_ai_app")

# Khởi tạo scheduler
scheduler = AsyncIOScheduler()

EXPIRATION_TIME = 60 * 60  # 10 phút


def cleanup_task_spam():
    """
    Xóa các payload trong task_service._log_spam đã quá 10 phút.
    Chạy tự động mỗi phút.
    """
    try:
        now = time.time()

        for group_id in list(task_service._log_spam.keys()):
            group = task_service._log_spam[group_id]

            for prefix in list(group.keys()):
                prefix_group = group[prefix]

                for number in list(prefix_group.keys()):
                    number_group = prefix_group[number]

                    expired_keys = [
                        key for key, payload in number_group.items()
                        if (now - payload.get("timestamp", 0)) > EXPIRATION_TIME
                    ]

                    for key in expired_keys:
                        del number_group[key]
                        task_service._reverse_index.pop(key, None)

                        logger.info(
                            f"[SPAM CLEANUP] Removed expired key={key} "
                            f"group={group_id}, prefix={prefix}, number={number}"
                        )

                    # Xóa number nếu rỗng
                    if not number_group:
                        del prefix_group[number]

                # Xóa prefix nếu rỗng
                if not prefix_group:
                    del group[prefix]

            # Xóa group nếu rỗng
            if not group:
                del task_service._log_spam[group_id]
                logger.info(f"[SPAM CLEANUP] Removed empty group_id={group_id}")

    except Exception as e:
        logger.error(f"[SPAM CLEANUP ERROR] {e}")

def start_scheduler():
    """
    Khởi động scheduler và thêm các scheduled jobs
    """
    try:
        # Job cleanup chạy mỗi phút
        scheduler.add_job(
            cleanup_task_spam,
            trigger=IntervalTrigger(seconds=60),
            id="task_spam_cleanup_job",
            name="Cleanup expired spam logs every minute",
            replace_existing=True
        )

        # Start scheduler
        scheduler.start()
        logger.info("Task Spam Cleanup Scheduler started successfully.")

        # Log tất cả jobs
        jobs = scheduler.get_jobs()
        for job in jobs:
            logger.info(f"Scheduled job: {job.name} - Next run: {job.next_run_time}")

    except Exception as e:
        logger.error(f"Error starting Task Spam Cleanup Scheduler: {e}")


def shutdown_scheduler():
    """
    Dừng scheduler khi app shutdown
    """
    try:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("Task Spam Cleanup Scheduler shut down successfully.")
        else:
            logger.info("Task Spam Cleanup Scheduler was not running.")
    except Exception as e:
        logger.error(f"Error shutting down Task Spam Cleanup Scheduler: {e}")
