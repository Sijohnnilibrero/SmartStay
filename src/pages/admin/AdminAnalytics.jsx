import { useState, useEffect, useCallback } from 'react'
import { Card, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { TrendingUp, Home, BedDouble, MapPin, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const MUNICIPALITIES = ['Basco', 'Mahatao', 'Ivana', 'Uyugan', 'Sabtang', 'Itbayat']
const COLORS = ['#1D9E75', '#534AB7', '#BA7517', '#D85A30', '#0F6E56', '#7C3AED']

export default function AdminAnalytics() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const user = useAuthStore(s => s.user)
  const fetchProperties = useAuthStore(s => s.fetchProperties)

  const loadData = useCallback(() => {
    setLoading(true)
    fetchProperties({}).then(data => {
      // Only include approved/active properties in the analytics
      let filtered = data.filter(p => p.status === 'approved' || p.status === 'active')
      if (user?.role === 'admin' && user?.admin_region) {
        if (user.admin_region === 'Batan Island') {
          filtered = filtered.filter(p => ['Basco', 'Mahatao', 'Ivana', 'Uyugan'].includes(p.municipality))
        } else {
          filtered = filtered.filter(p => p.municipality === user.admin_region)
        }
      }
      setProperties(filtered)
      setLoading(false)
    }).catch(err => {
      setError('Failed to load analytics data: ' + err.message)
      setLoading(false)
    })
  }, [user, fetchProperties])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-8 bg-stone-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-stone-200 rounded-2xl"></div>)}
        </div>
        <div className="h-[400px] bg-stone-200 rounded-3xl"></div>
      </div>
    )
  }

  // --- Data Processing ---
  
  // 1. KPIs
  const totalProps = properties.length
  let totalRooms = 0
  let availableRooms = 0
  let occupiedRooms = 0
  
  properties.forEach(p => {
    totalRooms += (p.total_rooms || 0)
    availableRooms += (p.available_rooms || 0)
  })
  occupiedRooms = totalRooms - availableRooms

  // 2. Properties Per Municipality
  const propsPerMuni = MUNICIPALITIES.map(muni => {
    return {
      name: muni,
      count: properties.filter(p => p.municipality === muni).length
    }
  }).filter(d => d.count > 0) // Hide empty municipalities for cleaner view

  // 3. Vacancy Overview (Pie Chart)
  const vacancyData = [
    { name: 'Available', value: availableRooms, color: '#1D9E75' },
    { name: 'Occupied', value: occupiedRooms, color: '#534AB7' },
  ]

  // 4. Pricing Trend per Municipality
  const pricingData = MUNICIPALITIES.map(muni => {
    const propsInMuni = properties.filter(p => p.municipality === muni && p.price_monthly > 0)
    if (propsInMuni.length === 0) return null
    const avg = propsInMuni.reduce((sum, p) => sum + p.price_monthly, 0) / propsInMuni.length
    return { name: muni, averagePrice: Math.round(avg) }
  }).filter(d => d !== null)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-stone-200 p-3 rounded-xl shadow-lg">
          <p className="font-bold text-stone-800 text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Average Price' || entry.dataKey === 'averagePrice' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-4">
        <p className="font-bold text-2xl text-stone-800">Analytics & Insights</p>
        <p className="text-sm text-stone-400 mt-0.5">
          {user?.admin_region ? `${user.admin_region} Territory Overview` : 'System-wide Metrics and Trends'}
        </p>
      </div>

      <div className="p-6 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col justify-between border-l-4 border-l-[#534AB7]">
            <div className="flex items-center gap-2 mb-2">
              <Home size={16} className="text-[#534AB7]" />
              <p className="text-xs uppercase tracking-wider text-stone-500 font-bold">Total Properties</p>
            </div>
            <p className="font-bold text-3xl text-stone-800">{totalProps}</p>
          </Card>
          
          <Card className="p-4 flex flex-col justify-between border-l-4 border-l-[#1D9E75]">
            <div className="flex items-center gap-2 mb-2">
              <BedDouble size={16} className="text-[#1D9E75]" />
              <p className="text-xs uppercase tracking-wider text-stone-500 font-bold">Total Rooms</p>
            </div>
            <p className="font-bold text-3xl text-stone-800">{totalRooms}</p>
          </Card>

          <Card className="p-4 flex flex-col justify-between border-l-4 border-l-[#BA7517]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#BA7517]" />
              <p className="text-xs uppercase tracking-wider text-stone-500 font-bold">Available</p>
            </div>
            <p className="font-bold text-3xl text-stone-800">{availableRooms} <span className="text-sm font-normal text-stone-400">rooms</span></p>
          </Card>

          <Card className="p-4 flex flex-col justify-between border-l-4 border-l-[#D85A30]">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-[#D85A30]" />
              <p className="text-xs uppercase tracking-wider text-stone-500 font-bold">Coverage</p>
            </div>
            <p className="font-bold text-3xl text-stone-800">{propsPerMuni.length} <span className="text-sm font-normal text-stone-400">towns</span></p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Properties per Municipality Bar Chart */}
          <Card className="p-6">
            <h3 className="font-bold text-stone-800 mb-6 flex items-center gap-2">
              <Home size={18} className="text-stone-400" /> Properties by Municipality
            </h3>
            {propsPerMuni.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propsPerMuni} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F4' }} />
                    <Bar dataKey="count" name="Properties" radius={[4, 4, 0, 0]}>
                      {propsPerMuni.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-stone-400 text-sm">No data available</div>
            )}
          </Card>

          {/* Vacancy Overview Pie Chart */}
          <Card className="p-6">
            <h3 className="font-bold text-stone-800 mb-6 flex items-center gap-2">
              <BedDouble size={18} className="text-stone-400" /> Vacancy Overview
            </h3>
            {totalRooms > 0 ? (
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vacancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {vacancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                  <p className="text-3xl font-bold text-stone-800">{Math.round((availableRooms / totalRooms) * 100)}%</p>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">Vacant</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-stone-400 text-sm">No room data available</div>
            )}
          </Card>

          {/* Pricing Trend Line Chart */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-bold text-stone-800 mb-6 flex items-center gap-2">
              <DollarSign size={18} className="text-stone-400" /> Average Pricing Trend (Monthly)
            </h3>
            {pricingData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pricingData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#78716C' }} 
                      tickFormatter={(val) => `₱${val / 1000}k`}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="averagePrice" 
                      name="Average Price" 
                      stroke="#1D9E75" 
                      strokeWidth={3} 
                      dot={{ r: 6, fill: '#1D9E75', stroke: '#fff', strokeWidth: 2 }} 
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-stone-400 text-sm">Not enough pricing data available</div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}
