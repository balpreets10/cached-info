import React from 'react';
import { Link } from 'react-router-dom';
import './OurStory.css';

const OurStory = () => {
    return (
        <div className="our-story">
            {/* Hero Section */}
            <section className="story-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Our Story
                    </h1>
                    <p className="hero-subtitle">
                        Bridging the gap between knowledge seekers and quality educational resources
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="mission-section">
                <div className="container">
                    <div className="mission-content">
                        <div className="mission-text">
                            <h2>Our Mission</h2>
                            <p>
                                At DigiBridge, we believe that quality education should be accessible to everyone. 
                                Our platform was born from a simple yet powerful idea: to create a bridge between 
                                students, educators, and the vast world of learning resources.
                            </p>
                            <p>
                                We understand the challenges that students face when searching for reliable, 
                                relevant, and up-to-date educational materials. Whether you're preparing for 
                                competitive exams, learning new skills, or pursuing academic excellence, 
                                finding the right resources shouldn't be a barrier to your success.
                            </p>
                        </div>
                        <div className="mission-image">
                            <div className="image-placeholder">
                                <span className="placeholder-icon">🎯</span>
                                <p>Our Mission</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Journey Section */}
            <section className="journey-section">
                <div className="container">
                    <h2 className="section-title">Our Journey</h2>
                    <div className="timeline">
                        <div className="timeline-item">
                            <div className="timeline-marker">2023</div>
                            <div className="timeline-content">
                                <h3>The Beginning</h3>
                                <p>
                                    Started as a small team of educators and developers who recognized 
                                    the need for a centralized platform for educational resources.
                                </p>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <div className="timeline-marker">2024</div>
                            <div className="timeline-content">
                                <h3>Platform Launch</h3>
                                <p>
                                    Launched DigiBridge with a focus on university resources, 
                                    skill development, and competitive exam preparation.
                                </p>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <div className="timeline-marker">2024</div>
                            <div className="timeline-content">
                                <h3>Community Growth</h3>
                                <p>
                                    Built a thriving community of students, educators, and 
                                    professionals sharing knowledge and resources.
                                </p>
                            </div>
                        </div>
                        <div className="timeline-item">
                            <div className="timeline-marker">Future</div>
                            <div className="timeline-content">
                                <h3>Expanding Horizons</h3>
                                <p>
                                    Continuing to innovate and expand our platform to serve 
                                    even more learners worldwide.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="values-section">
                <div className="container">
                    <h2 className="section-title">Our Values</h2>
                    <div className="values-grid">
                        <div className="value-card">
                            <div className="value-icon">🤝</div>
                            <h3>Community First</h3>
                            <p>
                                We believe in the power of community-driven learning. 
                                Every resource shared helps someone else on their educational journey.
                            </p>
                        </div>
                        <div className="value-card">
                            <div className="value-icon">✨</div>
                            <h3>Quality Assurance</h3>
                            <p>
                                Every resource on our platform is carefully curated and verified 
                                to ensure the highest quality for our users.
                            </p>
                        </div>
                        <div className="value-card">
                            <div className="value-icon">🌍</div>
                            <h3>Accessibility</h3>
                            <p>
                                Education should be accessible to everyone, regardless of 
                                their background, location, or financial situation.
                            </p>
                        </div>
                        <div className="value-card">
                            <div className="value-icon">🚀</div>
                            <h3>Innovation</h3>
                            <p>
                                We continuously innovate to provide the best learning 
                                experience and stay ahead of educational technology trends.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="team-section">
                <div className="container">
                    <h2 className="section-title">Meet Our Team</h2>
                    <div className="team-grid">
                        <div className="team-member">
                            <div className="member-avatar">
                                <span className="avatar-placeholder">👨‍💻</span>
                            </div>
                            <h3>Development Team</h3>
                            <p>
                                Our talented developers work tirelessly to create a seamless 
                                and intuitive platform experience.
                            </p>
                        </div>
                        <div className="team-member">
                            <div className="member-avatar">
                                <span className="avatar-placeholder">👩‍🏫</span>
                            </div>
                            <h3>Education Experts</h3>
                            <p>
                                Experienced educators who ensure the quality and relevance 
                                of all resources on our platform.
                            </p>
                        </div>
                        <div className="team-member">
                            <div className="member-avatar">
                                <span className="avatar-placeholder">👨‍💼</span>
                            </div>
                            <h3>Community Managers</h3>
                            <p>
                                Dedicated team members who foster engagement and support 
                                our growing community of learners.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Impact Section */}
            <section className="impact-section">
                <div className="container">
                    <h2 className="section-title">Our Impact</h2>
                    <div className="impact-stats">
                        <div className="impact-stat">
                            <div className="stat-number">10,000+</div>
                            <div className="stat-label">Students Helped</div>
                        </div>
                        <div className="impact-stat">
                            <div className="stat-number">500+</div>
                            <div className="stat-label">Resources Shared</div>
                        </div>
                        <div className="impact-stat">
                            <div className="stat-number">50+</div>
                            <div className="stat-label">Universities Covered</div>
                        </div>
                        <div className="impact-stat">
                            <div className="stat-number">95%</div>
                            <div className="stat-label">User Satisfaction</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials-section">
                <div className="container">
                    <h2 className="section-title">What Our Users Say</h2>
                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <div className="testimonial-content">
                                <p>
                                    "DigiBridge helped me find the perfect study materials for my 
                                    competitive exam preparation. The resources are top-notch!"
                                </p>
                            </div>
                            <div className="testimonial-author">
                                <div className="author-avatar">👨‍🎓</div>
                                <div className="author-info">
                                    <h4>Rahul Kumar</h4>
                                    <span>Engineering Student</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-content">
                                <p>
                                    "As an educator, I love how easy it is to share quality resources 
                                    with my students through this platform."
                                </p>
                            </div>
                            <div className="testimonial-author">
                                <div className="author-avatar">👩‍🏫</div>
                                <div className="author-info">
                                    <h4>Dr. Priya Sharma</h4>
                                    <span>University Professor</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-content">
                                <p>
                                    "The skill development resources here are excellent. 
                                    I've learned so much and advanced my career!"
                                </p>
                            </div>
                            <div className="testimonial-author">
                                <div className="author-avatar">👨‍💼</div>
                                <div className="author-info">
                                    <h4>Amit Patel</h4>
                                    <span>Software Developer</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Future Vision Section */}
            <section className="vision-section">
                <div className="container">
                    <div className="vision-content">
                        <h2>Our Vision for the Future</h2>
                        <p>
                            We envision a world where quality education is truly accessible to everyone. 
                            Our platform will continue to evolve, incorporating cutting-edge technology 
                            like AI-powered recommendations, virtual learning environments, and 
                            personalized learning paths.
                        </p>
                        <p>
                            We're committed to expanding our reach to serve students globally, 
                            partnering with more educational institutions, and creating an even 
                            more vibrant community of learners and educators.
                        </p>
                        <div className="vision-features">
                            <div className="vision-feature">
                                <span className="feature-icon">🤖</span>
                                <span>AI-Powered Learning</span>
                            </div>
                            <div className="vision-feature">
                                <span className="feature-icon">🌐</span>
                                <span>Global Reach</span>
                            </div>
                            <div className="vision-feature">
                                <span className="feature-icon">🎯</span>
                                <span>Personalized Paths</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="story-cta">
                <div className="container">
                    <div className="cta-content">
                        <h2>Join Our Journey</h2>
                        <p>
                            Be part of our mission to make quality education accessible to everyone. 
                            Start exploring resources, share your knowledge, or request what you need.
                        </p>
                        <div className="cta-buttons">
                            <Link to="/resources" className="cta-button primary">
                                Explore Resources
                            </Link>
                            <Link to="/submit" className="cta-button secondary">
                                Share a Resource
                            </Link>
                            <Link to="/request" className="cta-button secondary">
                                Request Resource
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default OurStory; 