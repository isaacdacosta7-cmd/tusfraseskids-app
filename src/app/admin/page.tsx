"use client";

import { useStore } from "@/context/StoreContext";
import { stories } from "@/lib/data";
import { CheckCircle, Clock, ShieldCheck, XCircle } from "lucide-react";
import Image from "next/image";

export default function AdminPage() {
    const { orders, updateOrderStatus } = useStore();

    const getStory = (id: string) => stories.find(s => s.id === id);

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-slate-900 text-white rounded-xl">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
                        <p className="text-slate-500">Verifica pagos y gestiona pedidos.</p>
                    </div>
                </header>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-6 font-semibold text-slate-600 text-sm">Pedido</th>
                                <th className="p-6 font-semibold text-slate-600 text-sm">Cuento</th>
                                <th className="p-6 font-semibold text-slate-600 text-sm">Cliente</th>
                                <th className="p-6 font-semibold text-slate-600 text-sm">Pago</th>
                                <th className="p-6 font-semibold text-slate-600 text-sm">Estado</th>
                                <th className="p-6 font-semibold text-slate-600 text-sm">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        No hay pedidos todavía.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const story = getStory(order.storyId);
                                    const isVerified = order.paymentStatus === "Verified";

                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 text-slate-500 font-mono text-xs">
                                                #{order.id.slice(0, 8)}
                                                <br />
                                                <span className="text-xxs text-slate-400">{order.date}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden relative">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={story?.coverImage} alt="" className="object-cover w-full h-full" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{story?.title}</p>
                                                        <p className="text-xs text-slate-500">Para: {order.childName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-sm">
                                                    <p className="font-semibold text-slate-700">{order.parentName}</p>
                                                    <p className="text-slate-500 text-xs">{order.email}</p>
                                                    <p className="text-slate-500 text-xs flex items-center gap-1">WA: {order.phone}</p>
                                                </div>
                                            </td>
                                            <td className="p-6 text-sm">
                                                <p className="font-medium text-slate-800">{order.paymentMethod}</p>
                                                {order.paymentProofUrl && (
                                                    <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                                                        Ver Comprobante
                                                    </a>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isVerified
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-amber-100 text-amber-700"
                                                    }`}>
                                                    {isVerified ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                    {isVerified ? "Verificado" : "Pendiente"}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                {isVerified ? (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, "Pending")}
                                                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                                                    >
                                                        Revertir
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, "Verified")}
                                                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-lg shadow-slate-900/20 hover:bg-black transition-all flex items-center gap-2"
                                                    >
                                                        <CheckCircle size={14} />
                                                        Aprobar Pago
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
