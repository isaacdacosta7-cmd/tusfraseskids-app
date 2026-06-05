"use client";

import { motion } from "framer-motion";
import { ShoppingBag, Star, Sparkles, Filter } from "lucide-react";
import { Story, stories } from "@/lib/data";
import Image from "next/image";
import { useState } from "react";
import { PurchaseModal } from "@/components/PurchaseModal";

export default function ExplorePage() {
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);

    return (
        <>
            <PurchaseModal
                isOpen={!!selectedStory}
                onClose={() => setSelectedStory(null)}
                story={selectedStory}
            />
            <div className="min-h-screen pb-20 pt-10 px-4">
                {/* Background Ambience */}
                <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-secondary-200/30 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-primary-200/30 rounded-full blur-[100px]" />
                </div>

                <div className="container mx-auto max-w-6xl">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-white/50 text-primary-700 text-sm font-bold mb-4 shadow-sm"
                        >
                            <Sparkles size={16} className="text-accent-500" />
                            <span>Colección Premium</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-5xl font-bold mb-4 text-slate-800"
                        >
                            Explora Nuestras Historias
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-slate-600 max-w-2xl mx-auto text-lg"
                        >
                            Elige una aventura, personalízala con el nombre de tu hijo y descarga un recuerdo eterno.
                        </motion.p>
                    </div>

                    {/* Filters & Promo Banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col md:flex-row justify-between items-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-lg mb-12 gap-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent-100 text-accent-700 rounded-xl">
                                <Star size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Oferta Especial</h3>
                                <p className="text-slate-600">Lleva <span className="font-bold text-primary-600">10 Historias</span> por solo <span className="font-bold text-green-600">$50</span></p>
                            </div>
                        </div>
                        <button className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 border border-slate-200">
                            <Filter size={18} />
                            Filtrar por Estilo
                        </button>
                    </motion.div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {stories.map((story, index) => (
                            <motion.div
                                key={story.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 * index }}
                                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/80 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            >
                                {/* Image Container */}
                                <div className="relative aspect-[3/4] overflow-hidden">
                                    <Image
                                        src={story.coverImage}
                                        alt={story.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                    {/* Price Tag */}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-slate-800 font-bold shadow-lg text-sm">
                                        ${story.price}
                                    </div>

                                    {/* Style Badge */}
                                    <div className="absolute top-4 left-4 bg-primary-600/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium shadow-lg">
                                        {story.style}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-primary-600 transition-colors">
                                        {story.title}
                                    </h3>
                                    <p className="text-slate-600 text-sm mb-6 line-clamp-2">
                                        {story.description}
                                    </p>

                                    <button
                                        onClick={() => setSelectedStory(story)}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag size={18} />
                                        Personalizar Ahora
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
