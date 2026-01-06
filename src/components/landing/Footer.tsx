import React from 'react';

interface FooterProps {
    content: {
        copyright: string;
        privacy: string;
        terms: string;
    };
}

const Footer: React.FC<FooterProps> = ({ content }) => {
    return (
        <footer className="bg-[#1A2332] text-white py-12 border-t border-white/10">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start">
                        <h3 className="text-xl font-serif text-[#C4A053] mb-2">DEL SOL PRIME HOMES</h3>
                        <p className="text-sm text-gray-400">© {new Date().getFullYear()} DelSolPrimeHomes. All rights reserved.</p>
                    </div>

                    <div className="flex gap-6 text-sm text-gray-400">
                        <a href="#" className="hover:text-[#C4A053] transition-colors">{content.privacy}</a>
                        <a href="#" className="hover:text-[#C4A053] transition-colors">{content.terms}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
