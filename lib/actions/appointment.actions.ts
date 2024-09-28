"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  messaging,
} from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";

// CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
  }
};

// GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
      (acc, appointment) => {
        switch (appointment.status) {
          case "scheduled":
            acc.scheduledCount++;
            break;
          case "pending":
            acc.pendingCount++;
            break;
          case "cancelled":
            acc.cancelledCount++;
            break;
        }
        return acc;
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
  }
};

// SEND EMAIL NOTIFICATION
export const sendEmailNotification = async (
  userId: string,
  subject: string,
  content: string
) => {
  try {
    // Send an email via Appwrite using Mailgun
    const message = await messaging.createEmail(
      ID.unique(), // Unique ID for the email
      subject, // Subject of the email
      content, // Content of the email
      [], // Attachments (optional)
      [userId] // Recipient user ID(s)
    );

    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending the email:", error);
  }
};

// SEND SMS NOTIFICATION
export const sendSMSNotification = async (userId: string, content: string) => {
  try {
    // Send SMS via Appwrite's messaging service
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [], // Attachments (optional)
      [userId] // Recipient user ID(s)
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending SMS:", error);
  }
};

// UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

    if (!updatedAppointment) throw Error;

    const location = "https://maps.app.goo.gl/qFqi73srDALDWW2x5";
    const notificationMessage = `Greetings from HealthCare+. ${
      type === "schedule"
        ? `Your appointment is confirmed for ${
            formatDateTime(appointment.schedule!, timeZone).dateTime
          } with Dr. ${appointment.primaryPhysician}.  Get Directions:  ${location}`
        : `We regret to inform you that your appointment for ${
            formatDateTime(appointment.schedule!, timeZone).dateTime
          } is cancelled.  Reason:  ${appointment.cancellationReason}.`
    }`;

    // Send both SMS and Email notifications
    await sendEmailNotification(
      userId,
      "Appointment Notification",
      notificationMessage
    );
    await sendSMSNotification(userId, notificationMessage);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("An error occurred while updating the appointment:", error);
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await databases.getDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );

    return parseStringify(appointment);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing appointment:",
      error
    );
  }
};
