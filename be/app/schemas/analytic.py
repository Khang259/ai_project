from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class AMRData(BaseModel):
    """Model for ICS data input (English field descriptions, length limits in comments)"""
    orderId: str = Field(..., description="Order ID from a third party system")  # string, 100
    qrContent: Optional[str] = Field(None, description="The destination point to which the current subtask will proceed, corresponding to the point assigned when a task is assigned")  # string, 100
    deviceNum: Optional[str] = Field(None, description="AGV ID")  # string, 32
    deviceCode: Optional[str] = Field(None, description="AGV SN")  # string, 64
    status: int = Field(..., description="Task status: 3: Canceled, 5: Sending failed, 6: Running, 7: Execution failed, 8: Completed, 9: Assigned, 10: Wait for acknowledgment, 20: Picking, 21: Picked, 22: Placing, 23: Placed")  # int, 2
    storageNum: Optional[str] = Field(None, description="Bin ID, corresponding to bin location")  # string, 32
    modelProcessCode: Optional[str] = Field(None, description="Task process template number")  # string, 32
    errorDesc: Optional[str] = Field(None, description="Task execution failed, or cause of failure when sending to the AGV")  # string, 64
    shelfNumber: Optional[str] = Field(None, description="Shelf code")  # string, 32
    shelfCurrPosition: Optional[str] = Field(None, description="Current shelf position")  # string, 32
    subTaskStatus: Optional[str] = Field(None, description="Action status of AGV in the RCS task template, extended field: 1: Not started, 2: Running, 3: Completing, 4: Failed, 5: Cancel")  # string, 2
    subTaskTypeId: Optional[str] = Field(None, description="AGV action type, extended field")  # string, 6
    subTaskId: Optional[str] = Field(None, description="RCS substask ID, reserved field")  # string, 10
    subTaskSeq: Optional[str] = Field(None, description="Action number, starting from 0, extended field")  # string, 2
    icsTaskOrderDetailId: Optional[str] = Field(None, description="Task ID registered in the ICS, extended field")  # string, 10
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AMRDataResponse(BaseModel):
    """Response model for API"""
    code: int = Field(..., description="Return status code")  # int, 6
    desc: str = Field(..., description="Status code description")  # string, 64