import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log('Fetching maintenance check data...')
    
    // Read JSON file
    const filePath = path.join(process.cwd(), 'json', 'maintenanceCheck.json')
    console.log('Reading file from:', filePath)
    
    const fileContent = readFileSync(filePath, 'utf8')
    const maintenanceData = JSON.parse(fileContent)
    
    console.log('Successfully loaded', maintenanceData.length, 'devices')
    
    return NextResponse.json(maintenanceData)
    
  } catch (error) {
    console.error('Error fetching maintenance data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch maintenance data',
        details: error.message 
      },
      { status: 500 }
    )
  }
}