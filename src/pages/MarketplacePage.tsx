/**
 * Surest Plug - Marketplace Page
 * Browse Ready-Made Websites, live database search, filter, and instant purchase
 */

import React, { useState, useMemo } from 'react';
import { Product, User } from '../types';
import { useBodyScrollLock } from '../lib/scrollLock';

interface MarketplacePageProps {
  products: Product[];
  currentUser: User | null;
  initialSearch?: string;
  onNavigate: (route: string, params?: any) => void;
  onQuickBuy: (product: Product) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  products,
  currentUser,
  initialSearch = '',
  onNavigate,
  onQuickBuy
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Lock body scroll when product details modal is open on mobile/tablet
  useBodyScrollLock(Boolean(selectedProduct));

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Ready-Made Websites Marketplace
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Production-ready website source code, landing pages, and web apps with instant delivery.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">No products found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {search ? 'No results matched your search term.' : 'Products will appear here once added to the catalog.'}
          </p>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => onNavigate('admin')}
              className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
            >
              Add Product in Admin Panel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, pIdx) => (
            <div 
              key={`mkt-prod-${product.id}-${pIdx}`}
              className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-extrabold text-blue-700 shadow-xs">
                    ₦{product.price.toLocaleString()}
                  </div>
                  {product.featured && (
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      Featured
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                      Ready-Made Website
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-emerald-600 font-semibold whitespace-nowrap">{product.delivery_time || 'Instant Delivery'}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {product.name}
                  </h3>

                  <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                    {product.description}
                  </p>

                  {product.features && product.features.length > 0 && (
                    <ul className="space-y-1.5 pt-2 border-t border-slate-100">
                      {product.features.slice(0, 3).map((feat, idx) => (
                        <li key={`card-feat-${pIdx}-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                          <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0 flex items-center gap-2">
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center whitespace-nowrap"
                >
                  Details
                </button>
                {product.demo_url && (
                  <a
                    href={product.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center whitespace-nowrap"
                  >
                    Preview
                  </a>
                )}
                <button
                  onClick={() => onQuickBuy(product)}
                  disabled={product.availability === 'out_of_stock'}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer text-center whitespace-nowrap ${
                    product.availability === 'out_of_stock'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md'
                  }`}
                >
                  {product.availability === 'out_of_stock' ? 'Out of Stock' : `Buy for ₦${product.price.toLocaleString()}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedProduct(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
          <div 
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sp-overlay-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-6">
              <div className="h-64 w-full rounded-2xl overflow-hidden bg-slate-100">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">
                  Ready-Made Website
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">{selectedProduct.name}</h2>
                <div className="text-2xl font-black text-blue-600 mt-1">₦{selectedProduct.price.toLocaleString()}</div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{selectedProduct.description}</p>
              </div>

              {selectedProduct.features && selectedProduct.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Features Included</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedProduct.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                {selectedProduct.demo_url && (
                  <a 
                    href={selectedProduct.demo_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl whitespace-nowrap"
                  >
                    Preview Website ↗
                  </a>
                )}
                <button
                  onClick={() => {
                    const p = selectedProduct;
                    setSelectedProduct(null);
                    onQuickBuy(p);
                  }}
                  disabled={selectedProduct.availability === 'out_of_stock'}
                  className={`flex-1 py-3 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap ${
                    selectedProduct.availability === 'out_of_stock'
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {selectedProduct.availability === 'out_of_stock' ? 'Out of Stock' : `Buy Now for ₦${selectedProduct.price.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketplacePage;
