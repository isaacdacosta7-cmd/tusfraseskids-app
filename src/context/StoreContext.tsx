"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Order } from "@/lib/data";
import { supabase } from "@/lib/supabase";

interface StoreContextType {
    orders: Order[];
    addOrder: (
        storyId: string,
        childName: string,
        parentName: string,
        email: string,
        phone: string,
        paymentMethod: string,
        paymentProof: File
    ) => Promise<void>;
    updateOrderStatus: (orderId: string, status: "Pending" | "Verified", pdfFile?: File) => Promise<void>;
    currentUserEmail: string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
    const [orders, setOrders] = useState<Order[]>([]);

    // In a real app with Auth, this would come from useUser()
    // For this prototype, we mock the logged-in user email to test RLS
    const currentUserEmail = "padre@ejemplo.com";

    // Fetch orders from Supabase
    const fetchOrders = async () => {
        // If admin (special logic for prototype, usually handled by Auth provider)
        // For now, we fetch ALL orders but RLS on Supabase will simply filter them
        // based on the 'auth.email()' which we can't easily fake without real Auth.
        // SO, for this prototype, we'll manually filter in client or rely on a simple query

        // To keep it simple: We fetch everything.
        // RLS is ON in Supabase, but since we are using 'anon' key and NOT signed in via GoTrue,
        // Supabase sees us as anonymous.
        // To make this work WITHOUT implementing full Auth UI right now:
        // We will just fetch everything for the Admin demo.

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else if (data) {
            // Map DB fields to our App type
            const mappedOrders: Order[] = data.map((o: any) => ({
                id: o.id,
                storyId: o.story_id,
                childName: o.child_name,
                parentName: o.parent_name,
                email: o.email,
                phone: o.phone,
                paymentMethod: o.payment_method,
                paymentProofUrl: o.payment_proof_url,
                paymentStatus: o.payment_status,
                date: new Date(o.created_at).toLocaleDateString(),
                downloadUrl: o.download_url || "#"
            }));
            setOrders(mappedOrders);
        }
    };

    // Initial load
    useEffect(() => {
        fetchOrders();
    }, []);

    const addOrder = async (
        storyId: string,
        childName: string,
        parentName: string,
        email: string,
        phone: string,
        paymentMethod: string,
        paymentProof: File
    ) => {
        try {
            // 1. Upload to Supabase Storage
            const fileExt = paymentProof.name.split('.').pop();
            // Clean filename: remove special chars, use random string
            const fileName = `proof-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, paymentProof, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: paymentProof.type // Pass the real MIME type (e.g. image/jpeg)
                });

            if (uploadError) {
                console.error('Error uploading file:', uploadError);
                throw new Error("No se pudo subir la imagen. Intenta de nuevo.");
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            // 3. Insert into DB
            // Note: Since we aren't using Real Auth, we hardcode the email for the RLS policy 'check'
            // or we rely on the public policy we just created.

            const { error: dbError } = await supabase.from('orders').insert([
                {
                    story_id: storyId,
                    child_name: childName,
                    parent_name: parentName,
                    email: email,
                    phone: phone,
                    payment_method: paymentMethod,
                    payment_proof_url: publicUrl, // Real URL
                    payment_status: 'Pending',
                    download_url: '#'
                }
            ]);

            if (dbError) throw dbError;

            fetchOrders(); // Refresh

        } catch (error: any) {
            console.error('Error adding order:', error);
            alert(`Error: ${error.message || "Ocurrió un error inesperado"}`);
        }
    };

    const updateOrderStatus = async (orderId: string, status: "Pending" | "Verified", pdfFile?: File) => {
        try {
            let downloadUrl = undefined;

            if (pdfFile && status === "Verified") {
                // 1. Upload story PDF to 'stories' bucket
                const fileName = `story-${orderId}-${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('stories')
                    .upload(fileName, pdfFile, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: 'application/pdf'
                    });

                if (uploadError) {
                    console.error('Error uploading story PDF:', uploadError);
                    alert("Error al subir el archivo PDF. Asegúrate de tener creado el bucket 'stories' en Supabase.");
                    return;
                }

                // 2. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('stories')
                    .getPublicUrl(fileName);
                downloadUrl = publicUrl;
            }

            // 3. Update database record
            const updates: any = { payment_status: status };
            if (downloadUrl) {
                updates.download_url = downloadUrl;
            }

            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', orderId);

            if (error) {
                console.error('Error updating order:', error);
            } else {
                fetchOrders();
            }
        } catch (error: any) {
            console.error('Unexpected error updating status:', error);
            alert(`Error: ${error.message || "Ocurrió un error inesperado"}`);
        }
    };

    return (
        <StoreContext.Provider value={{ orders, addOrder, updateOrderStatus, currentUserEmail }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return context;
}
