export interface Story {
    id: string;
    title: string;
    style: string;
    coverImage: string;
    description: string;
    price: number;
}

export const stories: Story[] = [
    {
        id: "1",
        title: "David y Goliat: Aventura de Fe",
        style: "Estilo Lego",
        coverImage: "https://i.imgur.com/GZM2fVb.jpeg",
        description: "Una aventura épica donde tu hijo enfrentará gigantes y descubrirá que con fe todo es posible.",
        price: 7,
    },
    {
        id: "2",
        title: "El Arca de Noé: Misión Animal",
        style: "Estilo Minecraft",
        coverImage: "https://i.imgur.com/smBDcJp.jpeg",
        description: "Construye, navega y cuida de la creación en esta increíble travesía sobre las aguas.",
        price: 7,
    },
    {
        id: "3",
        title: "La Reina Ester: Valentía Real",
        style: "Estilo Disney 3D",
        coverImage: "https://i.imgur.com/ctgzQpv.png",
        description: "Una historia sobre cómo la valentía y el amor pueden salvar a todo un pueblo.",
        price: 7,
    },
    {
        id: "4",
        title: "Jonás y la Gran Ballena",
        style: "Estilo Pixar",
        coverImage: "https://i.imgur.com/GZM2fVb.jpeg", // Reusing for demo
        description: "Una inmersión profunda para aprender sobre la obediencia y las segundas oportunidades.",
        price: 7,
    },
    {
        id: "5",
        title: "Moisés y el Mar Rojo",
        style: "Estilo Lego",
        coverImage: "https://i.imgur.com/smBDcJp.jpeg", // Reusing for demo
        description: "Abre camino a través de las aguas en esta emocionante huida hacia la libertad.",
        price: 7,
    },
    {
        id: "6",
        title: "El Nacimiento de Jesús",
        style: "Estilo Claymation",
        coverImage: "https://i.imgur.com/ctgzQpv.png", // Reusing for demo
        description: "La historia más grande jamás contada, llena de estrellas, ángeles y milagros.",
        price: 7,
    },
];

export interface Order {
    id: string;
    storyId: string;
    childName: string;
    parentName: string;
    email: string;
    phone: string;
    paymentMethod: string;
    paymentProofUrl?: string; // Optional for now
    paymentStatus: "Pending" | "Verified";
    date: string;
    downloadUrl?: string;
}

export const mockOrders: Order[] = [
    {
        id: "ord_001",
        storyId: "s1",
        childName: "Lucas",
        parentName: "Admin User",
        email: "admin@test.com",
        phone: "04240000000",
        paymentMethod: "Zelle",
        paymentStatus: "Verified",
        downloadUrl: "https://example.com/story.pdf",
        date: "2024-01-20"
    },
    {
        id: "ord_002",
        storyId: "s2",
        childName: "Sofía",
        parentName: "Admin User",
        email: "admin@test.com",
        phone: "04240000000",
        paymentMethod: "Pago Móvil",
        paymentStatus: "Pending",
        date: "2024-01-22"
    }
];
