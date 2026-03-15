import React from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '@/data/blogData';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface BlogCardProps {
    post: BlogPost;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
    return (
        <Link to={`/blog/${post.slug}`} className="group block">
            <article className="h-full bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-200 hover:transform hover:scale-[1.02]">
                {/* Image */}
                <div className="aspect-video bg-zinc-900 relative overflow-hidden">
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Category & Read Time */}
                    <div className="flex items-center gap-4 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/15 px-2 py-1 rounded">
                            {post.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-heading font-bold text-white mb-2 group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {post.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-zinc-400 text-sm mb-4 line-clamp-3">
                        {post.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>

                        <div className="flex items-center gap-1 text-sm text-zinc-400 group-hover:text-white transition-colors">
                            Read more
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
};
