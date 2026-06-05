"use client";

import { motion } from "framer-motion";
import { Download, Clock, Lock, FileText, CheckCircle2 } from "lucide-react";
import { stories } from "@/lib/data";
import { useStore } from "@/context/StoreContext";
import Image from "next/image";
import Link from "next/link";

export default function LibraryPage() {
    const { orders } = useStore();

    // Helper to get story details
    const getStory = (id: string) => stories.find(s => s.id === id);

    return (
        <div className="min-h-screen pb-20 pt-10 px-4 bg-slate-50/50">
            <div className="container mx-auto max-w-5xl">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Mi Librería Mágica</h1>
                    <p className="text-slate-500">Aquí viven las aventuras de tus pequeños.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {orders.map((order, index) => {
                        const story = getStory(order.storyId);
                        if (!story) return null;

                        const isVerified = order.paymentStatus === "Verified";

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4 group hover:shadow-md transition-shadow"
                            >
                                {/* Book Cover Preview */}
                                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
                                    <Image
                                        src={story.coverImage}
                                        alt={story.title}
                                        fill
                                        className={`object-cover ${!isVerified ? 'grayscale opacity-80' : ''}`}
                                    />

                                    {/* Status Overlay */}
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                        {!isVerified && (
                                            <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-white font-medium text-sm">
                                                <Clock size={16} />
                                                <span>Verificando Pago</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1 px-2">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 line-clamp-1">{story.title}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Para: <span className="text-primary-600">{order.childName}</span></p>
                                        </div>
                                        {isVerified && <CheckCircle2 size={20} className="text-green-500" />}
                                    </div>

                                    <div className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                                        <FileText size={12} />
                                        <span>Pedido #{order.id}</span>
                                    </div>

                                    {/* Action Button */}
                                    {isVerified ? (
                                        <a
                                            href={order.downloadUrl}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 text-white font-medium shadow-lg shadow-green-500/20 hover:bg-green-700 transition-colors"
                                        >
                                            <Download size={18} />
                                            Descargar PDF
                                        </a>
                                    ) : (
                                        <button disabled className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-medium cursor-not-allowed">
                                            <Lock size={18} />
                                            Descarga Bloqueada
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Empty State / Call to Action */}
                    <Link href="/explore" className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-slate-400 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50/50 transition-all min-h-[300px]">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                            <span className="text-2xl">+</span>
                        </div>
                        <p className="font-medium">Agregar nueva historia</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
