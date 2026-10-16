import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { UpdatePrompt } from './components/UpdatePrompt'
import { ChecklistPage } from './features/checklist/ChecklistPage'
import { CostPage } from './features/cost/CostPage'
import { HomePage } from './features/home/HomePage'
import { ProjectFormPage } from './features/project/ProjectFormPage'
import { ReportPage } from './features/report/ReportPage'
import { SettingsPage } from './features/settings/SettingsPage'

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/cost" element={<CostPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/more" element={<SettingsPage />} />
          <Route path="/project/new" element={<ProjectFormPage />} />
          <Route path="/project/:id/edit" element={<ProjectFormPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <UpdatePrompt />
    </BrowserRouter>
  )
}
