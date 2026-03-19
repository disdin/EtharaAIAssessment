/** Mirrors backend attendance JSON. */
export type AttendanceRecord = {
  _id: string
  employee_id: string
  date: string
  status: 'present' | 'absent'
  created_at: string
  updated_at: string
}

export type AttendanceMarkPayload = {
  employee_id: string
  date: string
  status: 'present' | 'absent'
}
