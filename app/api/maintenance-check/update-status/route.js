import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

export async function PUT(request) {
  try {
    const { id_thietBi, trang_thai, ngay_check } = await request.json()
    
    console.log('Update status request:', { id_thietBi, trang_thai, ngay_check })
    
    // Validate required fields
    if (!id_thietBi || !trang_thai) {
      return NextResponse.json(
        { error: 'Missing required fields: id_thietBi, trang_thai' },
        { status: 400 }
      )
    }
    
    // Read current JSON file
    const filePath = path.join(process.cwd(), 'json', 'maintenanceCheck.json')
    console.log('Reading file from:', filePath)
    
    const fileContent = readFileSync(filePath, 'utf8')
    const maintenanceData = JSON.parse(fileContent)
    
    // Find and update the device
    const deviceIndex = maintenanceData.findIndex(device => device.id_thietBi === id_thietBi)
    
    if (deviceIndex === -1) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }
    
    // Update device status
    maintenanceData[deviceIndex] = {
      ...maintenanceData[deviceIndex],
      trang_thai: trang_thai,
      ngay_check: ngay_check || maintenanceData[deviceIndex].ngay_check
    }
    
    // Write updated data back to file
    writeFileSync(filePath, JSON.stringify(maintenanceData, null, 2), 'utf8')
    
    console.log('Successfully updated device:', maintenanceData[deviceIndex])
    
    return NextResponse.json({
      success: true,
      message: 'Device status updated successfully',
      device: maintenanceData[deviceIndex]
    })
    
  } catch (error) {
    console.error('Error updating device status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update device status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}