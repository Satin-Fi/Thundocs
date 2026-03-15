import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Calendar, Clock, Tag, Share2, List } from 'lucide-react';
import { getBlogPostBySlug, getRelatedPosts } from '@/data/blogData';
import { BlogCard } from '@/components/BlogCard';
import ModernBackground from '@/components/ModernBackground';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? getBlogPostBySlug(slug) : undefined;
    const [activeSection, setActiveSection] = useState('');
    const isManualScroll = React.useRef(false);

    // Update page title and meta description for SEO
    useEffect(() => {
        if (post) {
            document.title = `${post.title} | Thundocs Blog`;

            // Update meta description
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', post.metaDescription);
            } else {
                const meta = document.createElement('meta');
                meta.name = 'description';
                meta.content = post.metaDescription;
                document.head.appendChild(meta);
            }

            // Add structured data for SEO (using data from post.schema)
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify(post.schema);
            document.head.appendChild(script);

            // Add FAQ schema if FAQs exist
            if (post.faqs && post.faqs.length > 0) {
                const faqSchema = {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": post.faqs.map(faq => ({
                        "@type": "Question",
                        "name": faq.question,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": faq.answer
                        }
                    }))
                };
                const faqScript = document.createElement('script');
                faqScript.type = 'application/ld+json';
                faqScript.text = JSON.stringify(faqSchema);
                faqScript.id = 'faq-schema';
                document.head.appendChild(faqScript);
            }

            return () => {
                document.title = 'Thundocs - Free PDF Tools';
                document.head.removeChild(script);
                const faqScript = document.getElementById('faq-schema');
                if (faqScript) document.head.removeChild(faqScript);
            };
        }
    }, [post]);

    // Scroll spy for table of contents
    useEffect(() => {
        const handleScroll = () => {
            if (isManualScroll.current) return;

            const headings = document.querySelectorAll('h2[id]');
            let current = '';

            headings.forEach(heading => {
                const rect = heading.getBoundingClientRect();
                if (rect.top <= 150) {
                    current = heading.id;
                }
            });

            setActiveSection(current);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!post) {
        return <Navigate to="/blog" replace />;
    }

    const relatedPosts = getRelatedPosts(post);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.excerpt,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

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

            {/* Subtle Background Pattern */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none opacity-20" />

            {/* Accent Glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-zinc-800/20 to-transparent blur-3xl pointer-events-none" />

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
                        to="/blog"
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Blog
                    </Link>
                </div>
            </header>

            {/* Article */}
            <article className="relative pt-32 pb-24 px-6">
                <div className="relative z-10 max-w-7xl mx-auto flex gap-12">
                    {/* Main Content */}
                    <div className="flex-1 max-w-3xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Category Badge */}
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/15 px-3 py-1.5 rounded-full">
                                    {post.category}
                                </span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                                {post.title}
                            </h1>

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(post.date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {post.readTime}
                                </div>
                                <div className="flex items-center gap-2">
                                    By {post.author}
                                </div>
                            </div>

                            {/* Share Button */}
                            <div className="mb-12">
                                <Button
                                    onClick={handleShare}
                                    variant="outline"
                                    className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share Article
                                </Button>
                            </div>

                            {/* Hero Image */}
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-12 bg-zinc-900">
                                <img
                                    src={post.image}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 to-transparent" />
                            </div>

                            {/* Content with Markdown Rendering */}
                            {/* Content with Markdown Rendering */}
                            <div className="prose prose-invert prose-zinc prose-lg max-w-none 
                                prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight
                                prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:mb-6
                                prose-li:text-zinc-300 prose-li:my-2
                                prose-strong:text-white prose-strong:font-semibold
                                prose-code:text-indigo-300 prose-code:bg-indigo-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                                prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-img:shadow-2xl
                            ">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl lg:text-4xl mb-8 mt-12 text-white" {...props} />,
                                        h2: ({ node, ...props }) => {
                                            const id = props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                            return (
                                                <h2
                                                    id={id}
                                                    className="text-2xl lg:text-3xl font-bold text-white mt-16 mb-6 scroll-mt-32 border-b border-white/5 pb-4"
                                                    {...props}
                                                />
                                            );
                                        },
                                        h3: ({ node, ...props }) => (
                                            <h3
                                                className="text-xl lg:text-2xl font-semibold text-white mt-10 mb-4"
                                                {...props}
                                            />
                                        ),
                                        p: ({ node, ...props }) => <p className="text-lg text-zinc-300 leading-8 mb-6" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-zinc-300" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-zinc-300" {...props} />,
                                        blockquote: ({ node, ...props }) => (
                                            <blockquote className="border-l-4 border-indigo-500 pl-6 italic text-zinc-300 my-8 py-2 bg-white/5 rounded-r-lg pr-4" {...props} />
                                        ),
                                        a: ({ node, ...props }) => {
                                            const href = props.href || '#';
                                            const isInternal = href.startsWith('/');

                                            if (isInternal) {
                                                return (
                                                    <Link
                                                        to={href}
                                                        className="text-violet-400 hover:text-violet-300 underline decoration-violet-500/30 hover:decoration-violet-400 transition-colors"
                                                    >
                                                        {props.children}
                                                    </Link>
                                                );
                                            }

                                            return (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-violet-400 hover:text-violet-300 underline decoration-violet-500/30 hover:decoration-violet-400 transition-colors"
                                                >
                                                    {props.children}
                                                </a>
                                            );
                                        },

                                        code: ({ node, inline, ...props }: any) =>
                                            inline ? (
                                                <code className="bg-zinc-800/50 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                            ) : (
                                                <code className="block bg-zinc-900 text-zinc-300 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                                            ),
                                        hr: ({ node, ...props }) => <hr className="border-t border-zinc-800 my-8" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                                        table: ({ node, ...props }) => (
                                            <div className="overflow-x-auto my-8">
                                                <table className="w-full text-left border-collapse" {...props} />
                                            </div>
                                        ),
                                        thead: ({ node, ...props }) => (
                                            <thead className="bg-zinc-900/50" {...props} />
                                        ),
                                        th: ({ node, ...props }) => (
                                            <th className="p-4 border-b border-zinc-800 font-heading font-semibold text-white whitespace-nowrap" {...props} />
                                        ),
                                        td: ({ node, ...props }) => (
                                            <td className="p-4 border-b border-zinc-800/50 text-zinc-300" {...props} />
                                        )
                                    }}
                                >
                                    {post.content}
                                </ReactMarkdown>
                            </div>

                            {/* Tags */}
                            <div className="mt-12 pt-8 border-t border-zinc-800">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Tag className="w-4 h-4 text-zinc-500" />
                                    {post.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="text-sm text-zinc-400 bg-zinc-900/50 border border-zinc-800 px-3 py-1 rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Table of Contents Sidebar */}
                    {
                        post.tableOfContents && post.tableOfContents.length > 0 && (
                            <aside className="hidden lg:block w-64 shrink-0">
                                <div className="sticky top-24">
                                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <List className="w-4 h-4 text-violet-400" />
                                            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
                                                Table of Contents
                                            </h3>
                                        </div>
                                        <nav className="space-y-2">
                                            {post.tableOfContents.map((item, index) => (
                                                <a
                                                    key={index}
                                                    href={`#${item.id}`}
                                                    className={`block text-sm py-1.5 px-3 rounded-lg transition-colors ${activeSection === item.id
                                                        ? 'bg-violet-500/15 text-violet-400 font-medium'
                                                        : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                                                        }`}
                                                    onClick={(e) => {
                                                        // Set manual scroll flag and active section immediately
                                                        isManualScroll.current = true;
                                                        setActiveSection(item.id);

                                                        // Reset flag after scroll animation (approx 1000ms safe buffer)
                                                        setTimeout(() => {
                                                            isManualScroll.current = false;
                                                        }, 1000);
                                                    }}
                                                >
                                                    {item.title}
                                                </a>
                                            ))}
                                        </nav>
                                    </div>
                                </div>
                            </aside>
                        )
                    }
                </div >
            </article >

            {/* Related Posts */}
            {
                relatedPosts.length > 0 && (
                    <section className="relative pb-24 px-6 border-t border-zinc-900">
                        <div className="relative z-10 max-w-7xl mx-auto pt-16">
                            <h2 className="text-3xl font-heading font-bold text-white mb-8">
                                Related Articles
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {relatedPosts.map(relatedPost => (
                                    <BlogCard key={relatedPost.id} post={relatedPost} />
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }

            {/* CTA Section */}
            <section className="relative pb-24 px-6">
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 border border-zinc-800 rounded-2xl p-8 md:p-12 text-center">
                        <h3 className="text-2xl md:text-3xl font-heading font-bold text-white mb-4">
                            Ready to try Thundocs?
                        </h3>
                        <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
                            Experience the best free PDF tools with complete privacy. No sign-up required.
                        </p>
                        <Link to="/">
                            <Button
                                size="lg"
                                className="h-12 px-8 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-base"
                            >
                                Explore Tools
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div >
    );
}
