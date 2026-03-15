import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Search } from 'lucide-react';
import { BlogCard } from '@/components/BlogCard';
import { allBlogPosts, getAllCategories } from '@/data/blogData';
import ModernBackground from '@/components/ModernBackground';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Blog() {
    const [searchQuery, setSearchQuery] = useState('');
    const categories = ['All', ...getAllCategories()];

    const filteredPosts = allBlogPosts.filter(post => {
        const matchesSearch =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    return (
        <div className="hero-group relative min-h-screen bg-[#020408] font-sans selection:bg-white/20">
            {/* Ambient lightning background */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute inset-0 opacity-25"
                    style={{
                        backgroundImage: "radial-gradient(rgba(0,240,255,0.03) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />
                <div
                    className="absolute -top-40 -left-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[120px]"
                    style={{
                        background:
                            "radial-gradient(circle at 30% 30%, #00f0ff 0%, #0055ff 40%, transparent 70%)",
                    }}
                />
                <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg]">
                    <svg
                        viewBox="0 0 512 512"
                        className="thunder-bolt-svg hero-bolt w-full h-full"
                    >
                        <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
                    </svg>
                </div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                            <Zap className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                        <span className="font-heading text-lg font-bold text-white tracking-tight">
                            Thundocs
                        </span>
                    </Link>

                    <Link
                        to="/"
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 px-6">
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-heading font-bold text-white mb-6">
                            Blog
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                            Guides, comparisons, and insights about PDF tools, document management, and productivity.
                        </p>

                        {/* Search */}
                        <div className="relative max-w-md mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <Input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-700"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Blog Posts */}
            <section className="relative pb-24 px-6">
                <div className="relative z-10 max-w-7xl mx-auto">
                    <Tabs defaultValue="All" className="w-full">
                        {/* Category Tabs */}
                        <div className="flex justify-center mb-12">
                            <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-full backdrop-blur-sm flex-wrap h-auto">
                                {categories.map(category => (
                                    <TabsTrigger
                                        key={category}
                                        value={category}
                                        className="rounded-full px-6 py-2.5 data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950 text-zinc-400 transition-all"
                                    >
                                        {category}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {/* All Posts */}
                        <TabsContent value="All" className="mt-0">
                            {filteredPosts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPosts.map(post => (
                                        <BlogCard key={post.id} post={post} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <p className="text-zinc-500">No articles found matching your search.</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* Category-specific Posts */}
                        {categories.filter(c => c !== 'All').map(category => (
                            <TabsContent key={category} value={category} className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPosts
                                        .filter(post => post.category === category)
                                        .map(post => (
                                            <BlogCard key={post.id} post={post} />
                                        ))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </section>
        </div>
    );
}
