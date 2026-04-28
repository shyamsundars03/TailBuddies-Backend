import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SpecialtySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    commonDesignation: [String],
    typicalKeywords: [String],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const Specialty = mongoose.model('Specialty', SpecialtySchema);

async function seedSpecialties() {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Connected to MongoDB');

        const specialties = [
            {
                name: 'Dental',
                description: 'Veterinary dentistry and oral surgery for pets.',
                commonDesignation: ['Veterinary Dentist', 'Oral Surgeon'],
                typicalKeywords: ['teeth', 'oral', 'cleaning', 'extraction'],
                status: 'active'
            },
            {
                name: 'Surgery',
                description: 'Specialized surgical procedures including orthopedic and soft tissue surgery.',
                commonDesignation: ['Veterinary Surgeon', 'Orthopedic Specialist'],
                typicalKeywords: ['surgery', 'orthopedic', 'operation', 'fracture'],
                status: 'active'
            },
            {
                name: 'Skin',
                description: 'Dermatology services for pets with skin allergies, infections, and disorders.',
                commonDesignation: ['Veterinary Dermatologist', 'Skin Specialist'],
                typicalKeywords: ['skin', 'allergy', 'itching', 'rash', 'dermatology'],
                status: 'active'
            },
            {
                name: 'Eye',
                description: 'Ophthalmology services for diagnosing and treating eye conditions in animals.',
                commonDesignation: ['Veterinary Ophthalmologist', 'Eye Specialist'],
                typicalKeywords: ['eye', 'vision', 'cataract', 'glaucoma', 'ophthalmology'],
                status: 'active'
            }
        ];

        for (const spec of specialties) {
            await Specialty.findOneAndUpdate(
                { name: spec.name },
                spec,
                { upsert: true, new: true }
            );
            console.log(`Ensured specialty: ${spec.name}`);
        }

        console.log('Seed completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seedSpecialties();
