package org.kreps.iotdb.protos;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.65.1)",
    comments = "Source: data.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class SenderGrpc {

  private SenderGrpc() {}

  public static final java.lang.String SERVICE_NAME = "batch.Sender";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<org.kreps.iotdb.protos.DataRequest,
      org.kreps.iotdb.protos.DataResponse> getGetDataMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "getData",
      requestType = org.kreps.iotdb.protos.DataRequest.class,
      responseType = org.kreps.iotdb.protos.DataResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.SERVER_STREAMING)
  public static io.grpc.MethodDescriptor<org.kreps.iotdb.protos.DataRequest,
      org.kreps.iotdb.protos.DataResponse> getGetDataMethod() {
    io.grpc.MethodDescriptor<org.kreps.iotdb.protos.DataRequest, org.kreps.iotdb.protos.DataResponse> getGetDataMethod;
    if ((getGetDataMethod = SenderGrpc.getGetDataMethod) == null) {
      synchronized (SenderGrpc.class) {
        if ((getGetDataMethod = SenderGrpc.getGetDataMethod) == null) {
          SenderGrpc.getGetDataMethod = getGetDataMethod =
              io.grpc.MethodDescriptor.<org.kreps.iotdb.protos.DataRequest, org.kreps.iotdb.protos.DataResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.SERVER_STREAMING)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "getData"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  org.kreps.iotdb.protos.DataRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  org.kreps.iotdb.protos.DataResponse.getDefaultInstance()))
              .setSchemaDescriptor(new SenderMethodDescriptorSupplier("getData"))
              .build();
        }
      }
    }
    return getGetDataMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static SenderStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<SenderStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<SenderStub>() {
        @java.lang.Override
        public SenderStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new SenderStub(channel, callOptions);
        }
      };
    return SenderStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static SenderBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<SenderBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<SenderBlockingStub>() {
        @java.lang.Override
        public SenderBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new SenderBlockingStub(channel, callOptions);
        }
      };
    return SenderBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static SenderFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<SenderFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<SenderFutureStub>() {
        @java.lang.Override
        public SenderFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new SenderFutureStub(channel, callOptions);
        }
      };
    return SenderFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default void getData(org.kreps.iotdb.protos.DataRequest request,
        io.grpc.stub.StreamObserver<org.kreps.iotdb.protos.DataResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetDataMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service Sender.
   */
  public static abstract class SenderImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return SenderGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service Sender.
   */
  public static final class SenderStub
      extends io.grpc.stub.AbstractAsyncStub<SenderStub> {
    private SenderStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected SenderStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new SenderStub(channel, callOptions);
    }

    /**
     */
    public void getData(org.kreps.iotdb.protos.DataRequest request,
        io.grpc.stub.StreamObserver<org.kreps.iotdb.protos.DataResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncServerStreamingCall(
          getChannel().newCall(getGetDataMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service Sender.
   */
  public static final class SenderBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<SenderBlockingStub> {
    private SenderBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected SenderBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new SenderBlockingStub(channel, callOptions);
    }

    /**
     */
    public java.util.Iterator<org.kreps.iotdb.protos.DataResponse> getData(
        org.kreps.iotdb.protos.DataRequest request) {
      return io.grpc.stub.ClientCalls.blockingServerStreamingCall(
          getChannel(), getGetDataMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service Sender.
   */
  public static final class SenderFutureStub
      extends io.grpc.stub.AbstractFutureStub<SenderFutureStub> {
    private SenderFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected SenderFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new SenderFutureStub(channel, callOptions);
    }
  }

  private static final int METHODID_GET_DATA = 0;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_GET_DATA:
          serviceImpl.getData((org.kreps.iotdb.protos.DataRequest) request,
              (io.grpc.stub.StreamObserver<org.kreps.iotdb.protos.DataResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getGetDataMethod(),
          io.grpc.stub.ServerCalls.asyncServerStreamingCall(
            new MethodHandlers<
              org.kreps.iotdb.protos.DataRequest,
              org.kreps.iotdb.protos.DataResponse>(
                service, METHODID_GET_DATA)))
        .build();
  }

  private static abstract class SenderBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    SenderBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return org.kreps.iotdb.protos.Data.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("Sender");
    }
  }

  private static final class SenderFileDescriptorSupplier
      extends SenderBaseDescriptorSupplier {
    SenderFileDescriptorSupplier() {}
  }

  private static final class SenderMethodDescriptorSupplier
      extends SenderBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    SenderMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (SenderGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new SenderFileDescriptorSupplier())
              .addMethod(getGetDataMethod())
              .build();
        }
      }
    }
    return result;
  }
}
