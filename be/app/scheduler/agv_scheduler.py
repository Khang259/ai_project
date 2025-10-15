"""
AGV Scheduler Module
Chứa các scheduled tasks để tự động chạy các công việc định kỳ
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.logging import get_logger
from app.services.agv_dashboard_service import reverse_dashboard_data

logger = get_logger("camera_ai_app")

# Khởi tạo scheduler
scheduler = AsyncIOScheduler()


def start_scheduler():
    """
    Khởi động scheduler và thêm các scheduled jobs
    """
    try:
        # Thêm job chạy vào 11h tối (23:00) hàng ngày
        # Gọi trực tiếp hàm từ service
        scheduler.add_job(
            reverse_dashboard_data,
            trigger=CronTrigger(hour=23, minute=0),  # Chạy vào 23:00 hàng ngày
            id='reverse_dashboard_daily',
            name='Reverse Dashboard Data Daily at 11 PM',
            replace_existing=True,
            misfire_grace_time=3600  # Cho phép chạy trong vòng 1 giờ nếu miss schedule
        )
        
        # Bắt đầu scheduler
        scheduler.start()
        logger.info("AGV Scheduler started successfully. Job scheduled at 23:00 daily.")
        
        # Log tất cả các jobs đã được scheduled
        jobs = scheduler.get_jobs()
        for job in jobs:
            logger.info(f"Scheduled job: {job.name} - Next run: {job.next_run_time}")
            
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")


def shutdown_scheduler():
    """
    Dừng scheduler khi app shutdown
    """
    try:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("AGV Scheduler shut down successfully.")
    except Exception as e:
        logger.error(f"Error shutting down scheduler: {e}")

