// Generated by the protocol buffer compiler.  DO NOT EDIT!
// NO CHECKED-IN PROTOBUF GENCODE
// source: data.proto
// Protobuf Java Version: 4.27.2

package org.kreps.iotdb.protos;

public interface DataRequestOrBuilder extends
    // @@protoc_insertion_point(interface_extends:batch.DataRequest)
    com.google.protobuf.MessageOrBuilder {

  /**
   * <code>string measurement = 1;</code>
   * @return The measurement.
   */
  java.lang.String getMeasurement();
  /**
   * <code>string measurement = 1;</code>
   * @return The bytes for measurement.
   */
  com.google.protobuf.ByteString
      getMeasurementBytes();

  /**
   * <code>string startDate = 2;</code>
   * @return The startDate.
   */
  java.lang.String getStartDate();
  /**
   * <code>string startDate = 2;</code>
   * @return The bytes for startDate.
   */
  com.google.protobuf.ByteString
      getStartDateBytes();

  /**
   * <code>string endDate = 3;</code>
   * @return The endDate.
   */
  java.lang.String getEndDate();
  /**
   * <code>string endDate = 3;</code>
   * @return The bytes for endDate.
   */
  com.google.protobuf.ByteString
      getEndDateBytes();
}
