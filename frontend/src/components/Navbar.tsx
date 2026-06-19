import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  async function signOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }
  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
      <Link to="/" className="font-bold text-blue-700 text-lg">Tax Deed Finder</Link>
      <Link to="/" className="text-gray-600 hover:text-gray-900">Search</Link>
      <Link to="/favorites" className="text-gray-600 hover:text-gray-900">Favorites</Link>
      <Link to="/alerts" className="text-gray-600 hover:text-gray-900">Alerts</Link>
      <button onClick={signOut} className="ml-auto text-sm text-gray-500 hover:text-gray-900">Sign Out</button>
    </nav>
  )
}
