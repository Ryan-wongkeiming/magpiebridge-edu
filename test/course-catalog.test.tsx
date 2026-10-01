import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CourseCatalog from '@/components/course-catalog'

// The catalog receives courses in the shape /api/courses returns after Phase 3:
// { id, title, description, status, thumbnailUrl, level, lessonCount,
//   durationMinutes, instructorName }.
function makeCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    title: 'Test Course',
    description: 'A test course',
    status: 'published',
    thumbnailUrl: null,
    level: null,
    lessonCount: 10,
    durationMinutes: 60,
    instructorName: 'Admin User',
    ...overrides,
  }
}

describe('CourseCatalog component', () => {
  it('renders the hero banner heading', () => {
    render(<CourseCatalog courses={[]} onEnroll={vi.fn()} />)
    expect(screen.getByText('Explore Our Course Catalog')).toBeInTheDocument()
  })

  it('renders the empty-state message when there are no courses', () => {
    render(<CourseCatalog courses={[]} onEnroll={vi.fn()} />)
    expect(screen.getByText('No courses available for enrollment')).toBeInTheDocument()
  })

  it('renders a course card with the title, lesson count, level fallback, and instructor', () => {
    render(<CourseCatalog courses={[makeCourse({ title: 'Unique Course Title' })]} onEnroll={vi.fn()} />)
    // The title appears in both the placeholder thumbnail and the card body
    // when thumbnailUrl is null; use getAllByText to accept the duplication.
    expect(screen.getAllByText('Unique Course Title').length).toBeGreaterThan(0)
    expect(screen.getByText('10 Lessons')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument() // level falls back to Beginner
    expect(screen.getByText('Admin User')).toBeInTheDocument()
  })

  it('renders "0 Lessons" when lessonCount is undefined (nullsafe)', () => {
    render(
      <CourseCatalog
        courses={[makeCourse({ lessonCount: undefined })]}
        onEnroll={vi.fn()}
      />
    )
    expect(screen.getByText('0 Lessons')).toBeInTheDocument()
  })

  it('hides the duration badge when durationMinutes is null', () => {
    render(
      <CourseCatalog
        courses={[makeCourse({ durationMinutes: null })]}
        onEnroll={vi.fn()}
      />
    )
    expect(screen.queryByText(/60 min/)).not.toBeInTheDocument()
  })

  it('shows the level when it is set', () => {
    render(
      <CourseCatalog
        courses={[makeCourse({ level: 'Advanced' })]}
        onEnroll={vi.fn()}
      />
    )
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('falls back to the placeholder instructor name when instructorName is null', () => {
    render(
      <CourseCatalog
        courses={[makeCourse({ instructorName: null })]}
        onEnroll={vi.fn()}
      />
    )
    expect(screen.getByText('MagpieBridge Instructor')).toBeInTheDocument()
  })

  it('disables the Enroll button for unpublished courses', () => {
    render(
      <CourseCatalog
        courses={[makeCourse({ status: 'draft' })]}
        onEnroll={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /enroll now/i })).toBeDisabled()
  })

  it('fires onEnroll with the course id when the Enroll button is clicked', () => {
    const handleEnroll = vi.fn()
    render(<CourseCatalog courses={[makeCourse({ id: 'c1' })]} onEnroll={handleEnroll} />)
    fireEvent.click(screen.getByRole('button', { name: /enroll now/i }))
    expect(handleEnroll).toHaveBeenCalledTimes(1)
    expect(handleEnroll).toHaveBeenCalledWith('c1')
  })

  it('shows the "Enrolling..." state while enrolling', () => {
    // onEnroll returns a promise that never resolves so the component stays
    // in the enrolling state for the assertion.
    const handleEnroll = vi.fn(() => new Promise(() => {}))
    render(<CourseCatalog courses={[makeCourse({ id: 'c1' })]} onEnroll={handleEnroll} />)
    fireEvent.click(screen.getByRole('button', { name: /enroll now/i }))
    expect(screen.getByRole('button', { name: /enrolling/i })).toBeInTheDocument()
  })
})
