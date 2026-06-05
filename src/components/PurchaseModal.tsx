"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Story } from "@/lib/data";
import { useStore } from "@/context/StoreContext";

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    story: Story | null;
}

export function PurchaseModal({ isOpen, onClose, story }: PurchaseModalProps) {
    const [step, setStep] = useState<"form" | "success">("form");
    const [fileName, setFileName] = useState<string>("");
    const [file, setFile] = useState<File | null>(null); // Store the real file

    // Form States
    const [childName, setChildName] = useState("");
    const [parentName, setParentName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Pago Móvil");

    const { addOrder } = useStore();

    if (!isOpen || !story) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (childName && file && parentName && email && phone) {
            await addOrder(story.id, childName, parentName, email, phone, paymentMethod, file);
            setStep("success");
        } else if (!file) {
            alert("Por favor sube el comprobante de pago.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileName(e.target.files[0].name);
            setFile(e.target.files[0]); // Set the real file
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8">
                        {step === "form" ? (
                            <>
                                <h2 className="text-2xl font-bold font-outfit text-slate-800 mb-2">
                                    Personaliza tu Historia
                                </h2>
                                <p className="text-slate-500 mb-6">
                                    Completa los datos para recibir "{story.title}" personalizado.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Child Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Nombre del Niño/a (Protagonista)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Sofía, Mateo..."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={childName}
                                            onChange={(e) => setChildName(e.target.value)}
                                        />
                                    </div>

                                    {/* Parent Name */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Nombre del Padre/Madre
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Tu nombre completo"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={parentName}
                                            onChange={(e) => setParentName(e.target.value)}
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Tu Correo (Donde recibirás el PDF)
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="tu-correo@ejemplo.com"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>

                                    {/* Phone / WhatsApp */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            WhatsApp (Para avisarte)
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="+58 412 1234567"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Método de Pago
                                        </label>
                                        <select
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            <option value="Pago Móvil">Pago Móvil Banesco</option>
                                            <option value="Binance">Binance</option>
                                            <option value="PayPal">PayPal</option>
                                            <option value="Zelle">Zelle</option>
                                        </select>
                                    </div>

                                    {/* Payment Instructions (Dynamic) */}
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
                                        <p className="font-semibold mb-1 text-slate-800">Datos para el pago:</p>
                                        {paymentMethod === "Pago Móvil" && (
                                            <p>Banesco - 0424 234 2401 - CI: 20.049.994</p>
                                        )}
                                        {paymentMethod === "Binance" && (
                                            <p>Correo: isaacdacosta7@gmail.com</p>
                                        )}
                                        {paymentMethod === "PayPal" && (
                                            <p>Correo: isaacdacosta7@yahoo.com</p>
                                        )}
                                        {paymentMethod === "Zelle" && (
                                            <p>Correo: (Consultar por WhatsApp)</p>
                                        )}
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Comprobante de Pago
                                        </label>
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-primary-500 transition-colors" />
                                                <p className="text-sm text-slate-500">
                                                    {fileName ? <span className="text-primary-600 font-medium">{fileName}</span> : "Sube tu captura aquí"}
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*,application/pdf"
                                                required
                                            />
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Confirmar Pedido
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Pedido Recibido!</h3>
                                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                                    Gracias <strong>{parentName}</strong>. Hemos recibido tu pedido para <strong>{childName}</strong>.
                                    <br /><br />
                                    Verificaremos el pago y te avisaremos por WhatsApp ({phone}) o correo ({email}) cuando tu cuento esté listo.
                                </p>
                                <button
                                    onClick={onClose}
                                    className="bg-slate-100 text-slate-700 font-bold py-3 px-8 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Entendido
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
