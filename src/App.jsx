import { Routes, Route } from 'react-router-dom'
import { LabelsProvider } from './lib/LabelsContext'
import MedicalForm from './components/MedicalForm'
import InfoPage from './components/InfoPage'
import NotFound from './components/NotFound'

export default function App() {
  return (
    <LabelsProvider>
      <Routes>
        <Route path="/" element={<MedicalForm />} />
        <Route path="/:uuid" element={<InfoPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </LabelsProvider>
  )
}
