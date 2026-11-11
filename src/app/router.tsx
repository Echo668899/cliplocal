import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { HomePage } from '@/pages/HomePage'
import { EditorPage } from '@/pages/EditorPage'
import { ToolsPage } from '@/pages/ToolsPage'
import { ToolPage } from '@/pages/tools/ToolPage'
import { FormatsPage } from '@/pages/FormatsPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { AdvancedPage } from '@/pages/AdvancedPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="tools/:slug" element={<ToolPage />} />
          <Route path="formats" element={<FormatsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="advanced" element={<AdvancedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
