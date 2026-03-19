export type DashboardSummary = {
  employee_count: number
  attendance_record_count: number
  present_marks: number
  absent_marks: number
}

export type EmployeeAttendanceStat = {
  employee_id: string
  full_name: string
  department: string
  present_days: number
  absent_days: number
}
