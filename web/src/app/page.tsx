"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Movie {
  title: string;
  source_url: string;
  extracted_links: string[];
  genre?: string;
  year?: number;
}

export default function Home() {
  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetch("/catalog.json")
      .then((res) => res.json())
      .then((data) => setCatalog(data))
      .catch((err) => console.error("Failed to load catalog:", err));
  }, []);

  // Dynamically extract unique categories from the catalog
  const categories = useMemo(() => {
    const cats = new Set(catalog.map(m => m.genre).filter(Boolean) as string[]);
    return ["All", ...Array.from(cats)];
  }, [catalog]);

  // Filter catalog based on search and category
  const filteredCatalog = useMemo(() => {
    return catalog.filter(movie => {
      const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || movie.genre === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [catalog, searchQuery, selectedCategory]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tighter text-indigo-500">
            FILM<span className="text-white">FLIX</span>
          </h1>
          
          {/* Search Bar */}
          <div className="w-full md:w-1/3 relative">
            <input 
              type="text" 
              placeholder="Search movies..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-3 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </header>
        
        {/* Categories / Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-full text-sm whitespace-nowrap font-medium transition-colors ${
                selectedCategory === category 
                  ? "bg-indigo-600 text-white" 
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredCatalog.map((movie, index) => {
            const videoUrl = movie.extracted_links[0];
            return (
              <div 
                key={index}
                className="group bg-zinc-900 rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 border border-zinc-800 hover:border-indigo-500/50 shadow-lg"
              >
                {/* Poster Placeholder */}
                <div className="aspect-[2/3] bg-zinc-800 flex flex-col items-center justify-center relative p-4">
                  <span className="text-zinc-500 font-bold uppercase text-center text-xl group-hover:text-indigo-400 transition-colors">
                    {movie.title}
                  </span>
                  {movie.year && (
                    <span className="absolute top-3 right-3 bg-zinc-950/80 text-xs px-2 py-1 rounded-md text-zinc-300">
                      {movie.year}
                    </span>
                  )}
                </div>
                
                <div className="p-4">
                  <h2 className="font-bold text-sm mb-1 truncate" title={movie.title}>
                    {movie.title}
                  </h2>
                  <p className="text-xs text-zinc-500 mb-4">{movie.genre || "Unknown"}</p>
                  
                  <Link 
                    href={`/watch?title=${encodeURIComponent(movie.title)}&url=${encodeURIComponent(videoUrl)}`}
                    className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    Watch Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredCatalog.length === 0 && (
          <div className="text-center text-zinc-500 mt-20 bg-zinc-900/50 rounded-2xl py-20 border border-zinc-800">
            <p className="text-xl font-medium">No titles found.</p>
            <p className="text-sm mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </main>
  );
}
