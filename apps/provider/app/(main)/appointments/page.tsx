const handleSaveAppointment = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        toast.error("Please sign in before creating an appointment");
        return reject();
      }

      const startTime = getStartTime();
      if (!formValues.patient_first_name || !formValues.patient_last_name) {
        toast.error("Patient first and last name are required");
        return reject();
      }
      if (!startTime) {
        toast.error("Please choose the appointment date and time");
        return reject();
      }

      setLoading(true);
      axiosClient
        .post(`provider/${userId}/appointments`, {
          patient_first_name: formValues.patient_first_name,
          patient_last_name: formValues.patient_last_name,
          patient_phone_number: formValues.patient_phone_number,
          patient_email: formValues.patient_email,
          appointment_type: formValues.appointment_type,
          start_time: startTime,
          message: formValues.message,
        })
        .then((res) => {
          toast.success("Appointment created");
          setFormValues(emptyForm);
          setAppointments((current) => [res.data, ...current]);
          resolve();
        })
        .catch(() => {
          toast.error(
            "An error occurred while submitting your appointment. Please try again later",
          );
          reject();
        })
        .finally(() => setLoading(false));
    });
  };
