import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const CardUpdateForm = ({ clientSecret }: { clientSecret: string }) => {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);

        const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: {
                card: cardElement!,
                billing_details: {
                    email,
                },
            },
        });

        if (error) {
            console.error("Error updating card:", error.message);
            alert("Failed to update card");
        } else {
            alert("Card updated successfully!");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <CardElement />
            <button
                type="submit"
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
                Update Card
            </button>
        </form>
    );
};