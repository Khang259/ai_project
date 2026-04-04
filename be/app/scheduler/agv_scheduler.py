"""
AGV Scheduler Module
Chứa các scheduled tasks để tự động chạy các công việc định kỳ
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.logging import get_logger
from app.services.agv_dashboard_service import (
    reverse_dashboard_data,
    delete_agv_data_older_than_days,
    save_agv_work_duration_by_hour,
)
from app.services.task_service import delete_old_tasks_with_status_6

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
        
        # Xóa agv_data cũ hơn 30 ngày, chạy vào 23:00 hàng ngày
        scheduler.add_job(
            delete_agv_data_older_than_days,
            trigger=CronTrigger(hour=23, minute=0),
            id='delete_agv_data_older_than_30_days',
            name='Delete AGV data older than 30 days at 11 PM',
            replace_existing=True,
            misfire_grace_time=3600,
        )

        # Chốt thời gian làm việc AGV theo giờ (agv_hourly_work_duration) lúc 1h sáng cho ngày hôm trước
        async def job_save_agv_work_duration_yesterday():
            yesterday = datetime.now() - timedelta(days=1)
            await save_agv_work_duration_by_hour(target_date=yesterday)

        scheduler.add_job(
            job_save_agv_work_duration_yesterday,
            trigger=CronTrigger(hour=1, minute=0),
            # trigger=CronTrigger(minute='*'),  # Mỗi phút (test)
            id='save_agv_work_duration_by_hour_daily',
            name='Save AGV hourly work duration (yesterday) at 1 AM',
            replace_existing=True,
            misfire_grace_time=3600,
        )

        # Xóa task status 6 cũ hơn 30 ngày, chạy vào 11:00 hàng ngày
        async def job_delete_old_tasks_status_6():
            await delete_old_tasks_with_status_6(days_old=30)

        scheduler.add_job(
            job_delete_old_tasks_status_6,
            trigger=CronTrigger(hour=11, minute=0),
            id='delete_old_tasks_status_6_daily',
            name='Delete old tasks with status 6 (30 days) at 11 AM',
            replace_existing=True,
            misfire_grace_time=3600,
        )
        
        # Bắt đầu scheduler
        scheduler.start()
        logger.info("AGV Scheduler started successfully.")
        
        # Log tất cả các jobs đã được scheduled
        jobs = scheduler.get_jobs()
        for job in jobs:
            logger.info(f"Scheduled job: {job.name} - Next run: {job.next_run_time}")
            
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")


def shutdown_scheduler():
    """
    Dừng scheduler khi app shutdown
    Đợi tối đa 10 giây để các jobs đang chạy hoàn thành
    """
    try:
        if scheduler.running:
            # Đợi tối đa 10 giây để jobs đang chạy hoàn thành
            scheduler.shutdown(wait=False)
            logger.info("AGV Scheduler shut down successfully.")
        else:
            logger.info("AGV Scheduler was not running.")
    except Exception as e:
        logger.error(f"Error shutting down scheduler: {e}")

