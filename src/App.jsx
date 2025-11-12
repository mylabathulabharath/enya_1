import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Video, Settings } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import JobCreator from './pages/JobCreator'
import SettingsPage from './pages/Settings'
import logo from '../assets/enya_logo-mian.png' 
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex items-center">
                  {/* <Video className="h-8 w-8 text-primary-600" /> */}
                  <img
                    src={logo}
                    alt="ENYA MEDIA Logo"
                    className="h-8 w-8 object-contain"
                  />
                  <span className="ml-2 text-xl font-bold text-gray-900">ENYA MEDIA</span>
                </div>
                <div className="flex space-x-1">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/create-job"
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Create Job
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-job" element={<JobCreator />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

