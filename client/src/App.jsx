import { useState, useEffect } from 'react'

const IconGrid = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
const IconList = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
const IconDeal = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
const IconHeart = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={filled ? "text-rose-500" : "text-slate-300"}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
)

function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedStore, setSelectedStore] = useState('Tous')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('jellycat-favs')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('jellycat-favs', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (productName) => {
    if (favorites.includes(productName)) {
      setFavorites(favorites.filter(name => name !== productName))
    } else {
      setFavorites([...favorites, productName])
    }
  }

  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(res => res.json())
      .then(data => {
        const sortedData = data.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        setProducts(sortedData)
        setLoading(false)
      })
      .catch(err => console.error("Erreur API:", err))
  }, [])

  const normalizeName = (name) => name.toLowerCase().replace(/jellycat|peluche|plush|amuseable|bashful|-/g, '').trim()

  const getBestDeal = (currentProduct) => {
    if (!currentProduct.price || currentProduct.price === "N/A") return null
    const currentPrice = parseFloat(currentProduct.price)
    const currentName = normalizeName(currentProduct.name)

    return products.find(p => {
      if (p.siteName === currentProduct.siteName) return false
      if (!p.price || p.price === "N/A") return false
      if (p.available === false) return false 

      const otherPrice = parseFloat(p.price)
      const otherName = normalizeName(p.name)
      return otherName.includes(currentName) && otherPrice < currentPrice
    })
  }

  const otherStores = [...new Set(products.map(p => p.siteName))].sort()
  const stores = ['Tous', 'Mes Favoris', ...otherStores]

  const filteredProducts = products.filter(product => {
    if (selectedStore === 'Mes Favoris') {
      if (!favorites.includes(product.name)) return false
    } else if (selectedStore !== 'Tous' && product.siteName !== selectedStore) {
      return false
    }
    if (searchTerm !== '' && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const formatPrice = (price) => (!price || price === "N/A") ? "Indisp." : `${price} $`

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-rose-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-rose-500 flex items-center gap-2 drop-shadow-sm">
                Jellycat Tracker
              </h1>
              <p>
                par Alexandra Bouffard
              </p>
            </div>
            <div className="flex-grow max-w-md mx-4 relative">
              <input 
                type="text" 
                placeholder="Rechercher un lapin, un dragon..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all text-sm"
              />
              <span className="absolute left-3 top-2.5 text-slate-400"><IconSearch /></span>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-rose-100 text-rose-600 text-sm font-bold px-4 py-1.5 rounded-full border border-rose-200">
                {filteredProducts.length}
              </span>
              <div className="flex bg-rose-50 p-1 rounded-lg border border-rose-200">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow text-rose-500' : 'text-rose-300'}`}><IconGrid /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow text-rose-500' : 'text-rose-300'}`}><IconList /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-50">
            {stores.map(store => (
              <button
                key={store}
                onClick={() => setSelectedStore(store)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                  selectedStore === store 
                    ? 'bg-rose-500 text-white border-rose-500 shadow-md transform scale-105' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-500'
                }`}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-rose-300 animate-pulse text-xl">Recherche des peluches en cours...</div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const deal = getBestDeal(product)
                  const isFav = favorites.includes(product.name)
                  const isAvailable = product.available !== false; 

                  return (
                    <div key={product.id || product.link} className={`bg-white rounded-2xl border border-rose-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative ${!isAvailable ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                      
                      <button 
                        onClick={(e) => { e.preventDefault(); toggleFavorite(product.name); }}
                        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm hover:scale-110 transition-transform cursor-pointer border border-rose-50"
                      >
                        <IconHeart filled={isFav} />
                      </button>

                      <div className="h-56 w-full bg-slate-50 flex items-center justify-center overflow-hidden relative">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
                        ) : <span className="text-4xl opacity-20">🧸</span>}
                        
                        {/* 1. BADGE STOCK (En haut à gauche) */}
                        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded shadow-sm border ${isAvailable ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {isAvailable ? 'EN STOCK' : 'ÉPUISÉ'}
                        </span>

                         {/* 2. DATE (Déplacée en bas à gauche !) */}
                         {product.dateAdded && (
                          <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-slate-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-slate-200">
                            Ajouté le {formatDate(product.dateAdded)}
                          </span>
                        )}
                      </div>
                      
                      <div className="p-5 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-3">
                           <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">{product.siteName}</span>
                           <span className={`text-sm font-bold px-2 py-0.5 rounded ${product.price && product.price !== 'N/A' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>{formatPrice(product.price)}</span>
                        </div>
                        <h2 className="font-bold text-slate-700 text-sm line-clamp-2 mb-3 flex-grow leading-relaxed" title={product.name}>
                          {product.name}
                        </h2>
                        {deal && isAvailable && (
                          <a href={deal.link} target="_blank" rel="noreferrer" className="mb-4 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 p-2 rounded-lg flex items-center gap-2 hover:bg-emerald-100 transition-colors animate-pulse">
                            <IconDeal /> <span>Trouvé à <b>{deal.price}$</b> chez {deal.siteName} !</span>
                          </a>
                        )}
                        <a href={product.link} target="_blank" rel="noreferrer" className={`mt-auto block w-full text-center py-2.5 rounded-xl text-white text-sm font-bold transition-all transform active:scale-95 ${isAvailable ? 'bg-slate-800 hover:bg-rose-500 hover:shadow-lg' : 'bg-slate-300 cursor-not-allowed'}`}>
                          {isAvailable ? 'Voir la peluche' : 'Rupture de stock'}
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {viewMode === 'list' && (
              <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-rose-50 text-xs uppercase text-rose-500 font-bold border-b border-rose-100">
                    <tr>
                      <th className="p-4 w-10"></th>
                      <th className="p-4 w-20">Img</th>
                      <th className="p-4">Jellycat</th>
                      <th className="p-4 w-32">État</th>
                      <th className="p-4 w-28 text-right">Prix</th>
                      <th className="p-4 w-40">Boutique</th>
                      <th className="p-4 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {filteredProducts.map((product) => {
                      const isFav = favorites.includes(product.name)
                      const isAvailable = product.available !== false;
                      return (
                      <tr key={product.id || product.link} className={`hover:bg-rose-50/50 transition-colors ${!isAvailable ? 'opacity-60' : ''}`}>
                        <td className="p-4">
                          <button onClick={() => toggleFavorite(product.name)} className="hover:scale-110 transition-transform">
                            <IconHeart filled={isFav} />
                          </button>
                        </td>
                        <td className="p-3">
                           {product.image ? <img src={product.image} className="w-12 h-12 object-contain rounded-md border border-rose-100 bg-white" /> : "🧸"}
                        </td>
                        <td className="p-4 font-medium text-slate-700">{product.name}</td>
                        <td className="p-4 text-xs font-bold">
                            <span className={`px-2 py-1 rounded ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {isAvailable ? 'EN STOCK' : 'ÉPUISÉ'}
                            </span>
                        </td>
                        <td className="p-4 text-right font-bold text-rose-500">{formatPrice(product.price)}</td>
                        <td className="p-4"><span className="px-2 py-1 rounded-md bg-rose-50 text-rose-400 text-xs font-bold border border-rose-100">{product.siteName}</span></td>
                        <td className="p-4 text-right">
                           <a href={product.link} target="_blank" rel="noreferrer" className="text-rose-400 hover:text-rose-600 text-xs font-bold uppercase tracking-wide hover:underline">Ouvrir</a>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App