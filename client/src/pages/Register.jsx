import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthForm } from "../hooks/useAuthForm";
import styles from "./Login.module.css"; 

const Register = () => {
  const { user } = useAuth();
  
  const {
    email,
    isLoading,
    error,
    success,
    handleEmailChange,
    handleSubmit
  } = useAuthForm();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.container} role="main">
      <div className={styles.branding}>
        <h1>CampusCart</h1>
        <p>Join the community. Your exclusive campus marketplace awaits.</p>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formCard}>
          <h2>Create Account</h2>
          <p id="register-desc">Enter your student email to begin</p>

          <div aria-live="polite" aria-atomic="true">
            {error && (
              <div className={styles.errorMsg} id="email-error" role="alert">
                {error}
              </div>
            )}
            
            {success && (
              <div className={styles.successMsg} id="email-success" role="status">
                {success}
              </div>
            )}
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate aria-describedby="register-desc">
            <div className={styles.inputGroup}>
              <label htmlFor="student-email">University Email</label>
              <input
                id="student-email"
                type="email"
                className={styles.input}
                placeholder="name@college.edu"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={isLoading || success}
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : success ? "email-success" : undefined}
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isLoading || success}
              aria-busy={isLoading}
            >
              {isLoading ? "Sending link..." : "Send Verification Link"}
            </button>
          </form>

          <div className={styles.registerLink}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
