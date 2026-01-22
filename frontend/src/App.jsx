import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import PlayerHome from './pages/PlayerHome'
import MatchDetail from './pages/MatchDetail'
import PlayerProfile from './pages/PlayerProfile'
import OwnerDashboard from './pages/OwnerDashboard'
import Rankings from './pages/Rankings'
import Friends from './pages/Friends'
import Leagues from './pages/Leagues'
import PublicHome from './pages/PublicHome'
import PreLaunchLanding from './pages/PreLaunchLanding'

// TEMPORAL: Cambiar a false después del 1 de febrero 2026 para volver a la home normal
const PRE_LAUNCH_MODE = true

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={PRE_LAUNCH_MODE ? <PreLaunchLanding /> : <PublicHome />} />
        <Route path="/home" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/player" element={<PlayerHome />} />
        <Route path="/player/match/:id" element={<MatchDetail />} />
        <Route path="/player/profile" element={<PlayerProfile />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/amigos" element={<Friends />} />
        <Route path="/ligas" element={<Leagues />} />
        <Route path="/player/profile/:id" element={<PlayerProfile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
