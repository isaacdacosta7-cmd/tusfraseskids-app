"use client";

import { motion } from "framer-motion";
import { BookOpen, Star, Heart, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-200/40 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-secondary-200/40 rounded-full blur-3xl animate-blob [animation-delay:2s]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-accent-100/40 rounded-full blur-3xl animate-blob [animation-delay:4s]" />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white/50 shadow-sm text-primary-700 text-sm font-medium mb-6">
            <Sparkles size={16} className="text-secondary-500" />
            <span>Historias que inspiran fe y amor</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Descubre la Aventura de <br />
            <span className="text-gradient">TusFrasesKids</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cuentos bíblicos personalizados donde tu hijo es el protagonista.
            Regala enseñanzas eternas en una aventura inolvidable.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/explore"
              className="group relative px-8 py-4 bg-primary-600 text-white rounded-2xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden"
            >
              <span className="relative z-10">Explorar Cuentos</span>
              <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 bg-white text-slate-700 rounded-2xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-100"
            >
              Cómo Funciona
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Star className="w-8 h-8 text-accent-500" />}
            title="Protagonista de Fe"
            description="Tu hijo vive la historia junto a héroes bíblicos, aprendiendo valores de primera mano."
            delay={0.2}
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8 text-primary-500" />}
            title="Historias Únicas"
            description="Cada cuento se adapta con el nombre y características especiales de tu pequeño."
            delay={0.4}
          />
          <FeatureCard
            icon={<Heart className="w-8 h-8 text-secondary-500" />}
            title="Recuerdo para Siempre"
            description="Descarga el PDF personalizado al instante y consérvalo como un tesoro familiar."
            delay={0.6}
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-8 rounded-3xl hover:shadow-xl transition-all duration-300 group"
    >
      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 text-3xl">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
