/** Mirrors backend `EmployeeOut` JSON (`_id` from Mongo). */
export type Employee = {
  _id: string
  employee_id: string
  full_name: string
  email: string
  department: string
  created_at: string
  updated_at: string
}

export type EmployeeCreatePayload = {
  employee_id: string
  full_name: string
  email: string
  department: string
}
